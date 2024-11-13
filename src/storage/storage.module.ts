import { Module } from '@nestjs/common';
import { s3ClientProvider } from './providers/s3-client.provider';

@Module({
  providers: [s3ClientProvider],
  exports: [s3ClientProvider]
})
export class StorageModule {}
