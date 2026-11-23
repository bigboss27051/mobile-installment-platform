import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerStatus, TenantStatus } from '@prisma/client';
import { randomInt } from 'crypto';
import {
  SMS_OTP,
  SmsOtpPort,
} from '../common/notifications/sms-otp.port';
import { PrismaService } from '../prisma/prisma.service';
import { customerOtpMatches, hashCustomerOtp } from './customer-otp';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_PER_WINDOW = 5;

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(SMS_OTP) private readonly smsOtp: SmsOtpPort,
  ) {}

  now(): Date {
    return new Date();
  }

  async requestOtp(input: {
    tenantSlug: string;
    phone: string;
  }): Promise<{ expiresAt: Date }> {
    const { tenant, customer } = await this.requireActiveCustomer(
      input.tenantSlug,
      input.phone,
    );
    const since = new Date(this.now().getTime() - OTP_WINDOW_MS);
    const recentCount = await this.prisma.customerOtpChallenge.count({
      where: {
        tenantId: tenant.id,
        phone: customer.phone,
        createdAt: { gte: since },
      },
    });
    if (recentCount >= OTP_MAX_PER_WINDOW) {
      throw new HttpException(
        'Too many OTP requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const channel = this.config.get<string>('OTP_CHANNEL', 'sandbox');
    const code =
      channel === 'sms'
        ? String(randomInt(100000, 1000000))
        : this.config.get<string>('CUSTOMER_OTP_SANDBOX_CODE', '123456');

    const expiresAt = new Date(this.now().getTime() + OTP_TTL_MS);
    const codeHash = hashCustomerOtp({
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      tenantId: tenant.id,
      phone: customer.phone,
      code,
    });

    const challenge = await this.prisma.customerOtpChallenge.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        phone: customer.phone,
        codeHash,
        expiresAt,
      },
    });

    if (channel === 'sms') {
      await this.smsOtp.sendOtp({
        tenantId: tenant.id,
        phone: customer.phone,
        code,
      });
    }

    return { expiresAt: challenge.expiresAt };
  }

  async verifyOtp(input: {
    tenantSlug: string;
    phone: string;
    code: string;
  }): Promise<{
    data: {
      accessToken: string;
      customer: {
        id: string;
        tenantId: string;
        fullName: string;
        phone: string;
      };
    };
  }> {
    const { tenant, customer } = await this.requireActiveCustomer(
      input.tenantSlug,
      input.phone,
    );
    const challenge = await this.prisma.customerOtpChallenge.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: customer.id,
        consumedAt: null,
        expiresAt: { gt: this.now() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    const actualHash = hashCustomerOtp({
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      tenantId: tenant.id,
      phone: customer.phone,
      code: input.code.trim(),
    });
    if (!customerOtpMatches(challenge.codeHash, actualHash)) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    await this.prisma.customerOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: this.now() },
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: customer.id,
        tenantId: customer.tenantId,
        typ: 'customer',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as never,
      },
    );

    return {
      data: {
        accessToken,
        customer: {
          id: customer.id,
          tenantId: customer.tenantId,
          fullName: customer.fullName,
          phone: customer.phone,
        },
      },
    };
  }

  private async requireActiveCustomer(tenantSlug: string, phone: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug.trim() },
      select: { id: true, slug: true, status: true },
    });
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Tenant not found.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        phone: phone.trim(),
        status: CustomerStatus.ACTIVE,
      },
      select: {
        id: true,
        tenantId: true,
        phone: true,
        fullName: true,
        status: true,
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return { tenant, customer };
  }
}
