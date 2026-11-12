import { Module } from '@nestjs/common';
import { LocalObjectStorageAdapter } from './local-object-storage.adapter';
import { OBJECT_STORAGE } from './object-storage.port';

@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      useClass: LocalObjectStorageAdapter,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
