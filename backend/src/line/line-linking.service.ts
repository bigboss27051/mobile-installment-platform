import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LineLinkStatus, PlatformRole, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { hasPermission } from '../common/authz/permissions';
import { LINE_CREDENTIALS_CRYPTO } from '../common/notifications/notifications.module';
import { LineCredentialsCrypto } from '../common/notifications/line-credentials-crypto';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

const LINK_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LineLinkingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LINE_CREDENTIALS_CRYPTO)
    private readonly credentialsCrypto: LineCredentialsCrypto,
  ) {}

  async createInvite(ctx: TenantContext, customerId: string) {
    this.requirePerm(ctx, 'line.link');
    const tenantId = this.requireTenantId(ctx);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const rawToken = randomBytes(16).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);

    await this.prisma.lineLinkingToken.create({
      data: {
        tenantId,
        customerId,
        tokenHash,
        expiresAt,
        createdById: ctx.userId,
      },
    });

    await this.audit(tenantId, customerId, ctx.userId, 'LINK_INVITE_CREATED', null, {
      expiresAt: expiresAt.toISOString(),
    });

    return {
      customerId,
      token: rawToken,
      expiresAt,
      instruction: `Add the shop LINE OA, then send: LINK ${rawToken}`,
    };
  }

  async getLinkStatus(ctx: TenantContext, customerId: string) {
    this.requirePerm(ctx, 'line.link');
    const tenantId = this.requireTenantId(ctx);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }
    const link = await this.prisma.lineCustomerLink.findFirst({
      where: { tenantId, customerId, status: LineLinkStatus.ACTIVE },
    });
    return {
      customerId,
      linked: Boolean(link),
      lineUserIdMasked: link ? this.maskLineUserId(link.lineUserId) : null,
      displayName: link?.displayName ?? null,
      linkedAt: link?.linkedAt ?? null,
    };
  }

  async unlink(ctx: TenantContext, customerId: string, reason: string) {
    this.requirePerm(ctx, 'line.link');
    const tenantId = this.requireTenantId(ctx);
    if (!reason.trim()) {
      throw new UnprocessableEntityException('Reason required to unlink.');
    }
    const link = await this.prisma.lineCustomerLink.findFirst({
      where: { tenantId, customerId, status: LineLinkStatus.ACTIVE },
    });
    if (!link) {
      throw new NotFoundException('No active LINE link.');
    }
    await this.prisma.lineCustomerLink.update({
      where: { id: link.id },
      data: { status: LineLinkStatus.UNLINKED, unlinkedAt: new Date() },
    });
    await this.audit(tenantId, customerId, ctx.userId, 'LINK_UNLINKED', reason, {
      lineUserIdMasked: this.maskLineUserId(link.lineUserId),
    });
    return { customerId, linked: false };
  }

  /**
   * Completes linking from a verified webhook (LINE user id from LINE, not client).
   */
  async consumeLinkToken(params: {
    tenantId: string;
    lineUserId: string;
    rawToken: string;
    displayName?: string | null;
  }) {
    const tokenHash = this.hashToken(params.rawToken);
    const token = await this.prisma.lineLinkingToken.findFirst({
      where: {
        tenantId: params.tenantId,
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!token) {
      throw new UnprocessableEntityException('Invalid or expired LINK token.');
    }

    const existingLine = await this.prisma.lineCustomerLink.findFirst({
      where: {
        tenantId: params.tenantId,
        lineUserId: params.lineUserId,
        status: LineLinkStatus.ACTIVE,
      },
    });
    if (existingLine && existingLine.customerId !== token.customerId) {
      throw new ConflictException('LINE account already linked to another customer.');
    }

    const existingCustomer = await this.prisma.lineCustomerLink.findFirst({
      where: {
        tenantId: params.tenantId,
        customerId: token.customerId,
        status: LineLinkStatus.ACTIVE,
      },
    });
    if (existingCustomer && existingCustomer.lineUserId !== params.lineUserId) {
      throw new ConflictException('Customer already has an active LINE link.');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.lineLinkingToken.update({
          where: { id: token.id },
          data: { consumedAt: new Date() },
        });
        if (!existingLine) {
          await tx.lineCustomerLink.create({
            data: {
              tenantId: params.tenantId,
              customerId: token.customerId,
              lineUserId: params.lineUserId,
              status: LineLinkStatus.ACTIVE,
              displayName: params.displayName ?? null,
            },
          });
        }
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('LINE link conflict.');
      }
      throw error;
    }

    await this.audit(
      params.tenantId,
      token.customerId,
      null,
      'LINK_COMPLETED',
      null,
      { lineUserIdMasked: this.maskLineUserId(params.lineUserId) },
    );

    return { customerId: token.customerId, linked: true };
  }

  async findActiveByLineUser(tenantId: string, lineUserId: string) {
    return this.prisma.lineCustomerLink.findFirst({
      where: { tenantId, lineUserId, status: LineLinkStatus.ACTIVE },
    });
  }

  private hashToken(raw: string): string {
    // Prefer dedicated hash; credentials crypto uses same HMAC key material.
    return this.credentialsCrypto.hashToken(raw);
  }

  private maskLineUserId(lineUserId: string): string {
    if (lineUserId.length <= 6) return '****';
    return `${lineUserId.slice(0, 2)}****${lineUserId.slice(-4)}`;
  }

  private async audit(
    tenantId: string,
    customerId: string | null,
    actorUserId: string | null,
    action: string,
    reason: string | null,
    meta: Record<string, unknown>,
  ) {
    await this.prisma.lineAuditEvent.create({
      data: {
        tenantId,
        customerId: customerId ?? undefined,
        actorUserId: actorUserId ?? undefined,
        action,
        reason: reason ?? undefined,
        metaJson: meta as Prisma.InputJsonValue,
      },
    });
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private requirePerm(ctx: TenantContext, permission: 'line.link') {
    if (!hasPermission(ctx.role as PlatformRole | null, permission)) {
      throw new ForbiddenException(`Missing permission ${permission}.`);
    }
  }
}
