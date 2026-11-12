import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { ContractsModule } from './contracts/contracts.module';
import { CustomersModule } from './customers/customers.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { KycModule } from './kyc/kyc.module';
import { OcrModule } from './common/ocr/ocr.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    HealthModule,
    PrismaModule,
    TenantsModule,
    PlansModule,
    ApplicationsModule,
    ContractsModule,
    AuthModule,
    CustomersModule,
    KycModule,
    CatalogModule,
    InventoryModule,
    StorageModule,
    OcrModule,
  ],
})
export class AppModule {}
