import { Controller, Get, Post, Body, Patch, Param, Logger, UseInterceptors, UploadedFiles, ParseFilePipeBuilder, HttpStatus, Query } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Rol } from '../users/enum/rol.enum';
import { ActorUser } from '../common/decorators/actor-user.decorator';
import { ActorUserInterface } from '../common/interfaces/actor-user.interface';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CustomUploadFileTypeValidator } from '../common/validation/fileTypeValidator';
import { ConsultaQueryDTO } from './dto/consulta-query.dto';
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';


@Controller('consultas')
export class ConsultasController {

  // Constantes para manejo de paginación y formato de fechas
  private readonly PAGE_SIZE = 1;
  private readonly TIME_ZONE = 'America/Bogota';
  private readonly DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

  private readonly logger = new Logger(ConsultasController.name);

  constructor(private readonly consultasService: ConsultasService) {}

  @Authorization([Rol.ADMIN, Rol.ESTUDIANTE])
  @Post()
  @UseInterceptors(FilesInterceptor('anexos', 6))
  async createConsulta(
    @Body() createConsultaDto: CreateConsultaDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomUploadFileTypeValidator({
            fileType: ['application/pdf']
          })
        )
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'El tamaño máximo permitido por archivo es de 2MB' })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, fileIsRequired: false })
    ) anexos: Array<Express.Multer.File>
  ) {

    const consulta = await this.consultasService.registerConsulta(createConsultaDto, sub, anexos);
    this.logger.log({
      radicadoConsulta: consulta.radicado,
      responsibleUser: { sub, username, rol },
      request: {}
    }, `User ${username} has registered a new consulta: ${consulta.radicado}`);
    return {
      status: 201,
      message: `Consulta ${consulta.radicado} registrada correctamente`,
      data: null
    }

  }


  @Authorization([Rol.ADMIN])
  @Get()
  async findAllConsultas(
    @Query() query: ConsultaQueryDTO
  ) {

    // Datos del objeto query
    const {
      area_derecho,
      tipo_consulta,
      estado,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      order,
      cursor,
      prevCursor,
      searchItem
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Parseamos el cursor recibido
    const parsedCursor = cursor
      ? +cursor
      : prevCursor
        ? +prevCursor
        : undefined;
    
    // Determinar la dirección de la paginación - si es none quiere decir que estamos en la primera página
    const direction: 'next' | 'prev' | 'none' = cursor
      ? 'next'
      : prevCursor
        ? 'prev'
        : 'none';
      
    // Objeto de configuración de paginación
    const pagination = {
      cursor: parsedCursor ? { id: parsedCursor } : undefined,
      limit: this.PAGE_SIZE,
      direction
    };

    // TODO: Formatear la cadena para busqueda basada en texto
    const formattedSearchItem = '';

    const {
      consultas,
      nextCursor: nextCursorId,
      prevCursor: prevCursorId
    } 
    = await this.consultasService.getConsultasByFilters(
      filters,
      order,
      pagination,
      formattedSearchItem
    )
    
    // Formateamos las fechas antes de enviarlas
    const formattedConsultas = consultas.map((consulta) => {

      const zonedFecha_registro = new TZDate(consulta.fecha_registro, this.TIME_ZONE);

      const formattedFecha_registro = format(zonedFecha_registro, this.DATE_FORMAT);

      // Si recibimos claves anidada, combinamos todo en un objeto principal
      const formattedConsulta = {
        ...consulta,
        fecha_registro: formattedFecha_registro,
        solicitante_nombre: consulta.solicitante.nombre, 
        solicitante_apellidos: consulta.solicitante.apellidos, 
        solicitante_tipo_identificacion: consulta.solicitante.tipo_identificacion, 
        solicitante_numero_identificacion: consulta.solicitante.numero_identificacion, 
        estudiante_nombres: consulta.estudiante_registro.nombres, 
        estudiante_apellidos: consulta.estudiante_registro.apellidos, 
        estudiante_codigo: consulta.estudiante_registro.codigo
      }

      // Se elimina la propiedad del nuevo objeto para que no quede anidada
      delete formattedConsulta.solicitante;
      delete formattedConsulta.estudiante_registro;

      return formattedConsulta

    });

    return {
      status: 200,
      message: 'Consultas obtenidas correctamente',
      data: formattedConsultas,
      nextCursor: nextCursorId ? nextCursorId : null, // Devuelve el cursor para la siguiente página
      prevCursor: prevCursorId ? prevCursorId : null, // Devuelve el cursor para la anterior página
      pageSize: this.PAGE_SIZE
    };

  }


  @Authorization([Rol.ADMIN])
  @Get('/count')
  async countConsultas(
    @Query() query: ConsultaQueryDTO
  ) {

    // Datos del objeto query
    const {
      area_derecho,
      tipo_consulta,
      estado,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      searchItem
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Cadena para busqueda basada en texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    // Obtenemos el conteo
    const totalRecords = await this.consultasService.countConsultasByFilters(filters, formattedSearchItem);

    return {
      status: 200,
      message: 'Conteo de consultas realizado correctamente',
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultasService.findOne(+id);
  }


  // Para cambio de area

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultaDto: UpdateConsultaDto) {
    return this.consultasService.update(+id, updateConsultaDto);
  }

}
