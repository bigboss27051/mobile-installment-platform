import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NationalIdCrypto } from '../common/crypto/national-id.crypto';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    {
      provide: NationalIdCrypto,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new NationalIdCrypto(configService.getOrThrow<string>('NATIONAL_ID_ENCRYPTION_KEY')),
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
