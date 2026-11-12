import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalObjectStorageAdapter } from './local-object-storage.adapter';
import { OBJECT_STORAGE } from './object-storage.port';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new LocalObjectStorageAdapter(configService.get<string>('KYC_STORAGE_ROOT', './storage/kyc')),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
