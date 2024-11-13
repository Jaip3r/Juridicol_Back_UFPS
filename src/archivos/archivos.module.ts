import { Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [ArchivosService],
  exports: [ArchivosService]
})
export class ArchivosModule {}
