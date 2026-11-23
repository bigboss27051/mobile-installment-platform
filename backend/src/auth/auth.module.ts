import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BlockedSmsAdapter } from '../common/notifications/blocked-sms.adapter';
import { SMS_OTP } from '../common/notifications/sms-otp.port';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { JwtCustomerStrategy } from './strategies/jwt-customer.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TenantsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, CustomerAuthController],
  providers: [
    AuthService,
    CustomerAuthService,
    JwtStrategy,
    JwtCustomerStrategy,
    BlockedSmsAdapter,
    {
      provide: SMS_OTP,
      useExisting: BlockedSmsAdapter,
    },
  ],
  exports: [AuthService, CustomerAuthService],
})
export class AuthModule {}
