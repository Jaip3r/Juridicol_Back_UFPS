import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SolicitantesService } from './solicitantes.service';
import { CreateSolicitanteDto } from './dto/create-solicitante.dto';
import { UpdateSolicitanteDto } from './dto/update-solicitante.dto';

@Controller('solicitantes')
export class SolicitantesController {
  constructor(private readonly solicitantesService: SolicitantesService) {}

  @Post()
  create(@Body() createSolicitanteDto: CreateSolicitanteDto) {
    return this.solicitantesService.create(createSolicitanteDto);
  }

  @Get()
  findAll() {
    return this.solicitantesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solicitantesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSolicitanteDto: UpdateSolicitanteDto) {
    return this.solicitantesService.update(+id, updateSolicitanteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.solicitantesService.remove(+id);
  }
}
