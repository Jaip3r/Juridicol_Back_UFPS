import { PartialType } from '@nestjs/swagger';
import { CreateSolicitanteDto } from './create-solicitante.dto';

export class UpdateSolicitanteDto extends PartialType(CreateSolicitanteDto) {}
