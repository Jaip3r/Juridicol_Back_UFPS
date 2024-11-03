import { PartialType } from '@nestjs/swagger';
import { CreateConsultaDto } from './create-consulta.dto';

export class UpdateConsultaDto extends PartialType(CreateConsultaDto) {}
