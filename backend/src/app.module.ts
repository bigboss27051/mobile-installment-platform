import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { ContractsModule } from './contracts/contracts.module';
import { DevicesModule } from './devices/devices.module';
import { CustomersModule } from './customers/customers.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { KycModule } from './kyc/kyc.module';
import { AuthzModule } from './common/authz/authz.module';
import { OcrModule } from './common/ocr/ocr.module';
import { PaymentsModule } from './payments/payments.module';
import { PortalModule } from './portal/portal.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { NotificationsModule } from './common/notifications/notifications.module';
import { LineModule } from './line/line.module';
import { StaffModule } from './staff/staff.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_GLOBAL_LIMIT ?? 120),
      },
    ]),
    AuthzModule,
    NotificationsModule,
    HealthModule,
    PrismaModule,
    TenantsModule,
    PlansModule,
    ApplicationsModule,
    ContractsModule,
    DevicesModule,
    AuthModule,
    CustomersModule,
    KycModule,
    CatalogModule,
    InventoryModule,
    StaffModule,
    PaymentsModule,
    PortalModule,
    StorageModule,
    OcrModule,
    LineModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
