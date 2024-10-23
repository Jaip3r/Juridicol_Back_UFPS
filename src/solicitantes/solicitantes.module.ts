import { Module } from '@nestjs/common';
import { SolicitantesService } from './solicitantes.service';
import { SolicitantesController } from './solicitantes.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SolicitantesController],
  providers: [SolicitantesService],
})
export class SolicitantesModule {}
