import { Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/storage/storage.module';
import { ArchivosController } from './archivos.controller';


@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService]
})
export class ArchivosModule {}
