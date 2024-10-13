import { Module } from '@nestjs/common';
import { SolicitantesService } from './solicitantes.service';
import { SolicitantesController } from './solicitantes.controller';

@Module({
  controllers: [SolicitantesController],
  providers: [SolicitantesService],
})
export class SolicitantesModule {}
