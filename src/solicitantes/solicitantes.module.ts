import { Module } from '@nestjs/common';
import { SolicitantesService } from './solicitantes.service';
import { SolicitantesController } from './solicitantes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SolicitantesController],
  providers: [SolicitantesService],
  exports: [SolicitantesService]
})
export class SolicitantesModule {}
