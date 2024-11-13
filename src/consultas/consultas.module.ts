import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';
import { SolicitantesModule } from '../solicitantes/solicitantes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from 'src/storage/storage.module';
import { ArchivosModule } from 'src/archivos/archivos.module';


@Module({
  imports: [
    SolicitantesModule, 
    PrismaModule,
    StorageModule,
    ArchivosModule
  ],
  controllers: [ConsultasController],
  providers: [ConsultasService]
})
export class ConsultasModule {}
