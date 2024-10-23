import { Controller, Get, Post, Body, Patch, Param, Logger, Query, Res } from '@nestjs/common';
import { SolicitantesService } from './solicitantes.service';
import { CreateSolicitanteDto } from './dto/create-solicitante.dto';
import { UpdateSolicitanteDto } from './dto/update-solicitante.dto';
import { Authorization } from 'src/auth/decorators/auth.decorator';
import { Rol } from 'src/users/enum/rol.enum';
import { ActorUser } from 'src/common/decorators/actor-user.decorator';
import { ActorUserInterface } from 'src/common/interfaces/actor-user.interface';
import { SolcitanteQueryDto } from './dto/solicitante-query.dto';
import { validateIdParamDto } from 'src/common/dto/validate-idParam.dto';
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { UTCDate } from '@date-fns/utc';
import { Response } from 'express';
import { generateExcelReport } from 'src/common/utils/generateExcelReport';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SolicitantePaginateResponseDto } from './dto/response/solicitante-paginate-reponse.dto';
import { SolicitanteResponseDto } from './dto/response/solicitante-response.dto';
import { CreateApiResponseDto } from 'src/common/dto/create-api-response.dto';
import { GenericApiResponseDto } from 'src/common/dto/generic-api-response.dto';


@ApiTags('solicitantes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado.' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado.' })
@ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
@Authorization([Rol.ADMIN])
@Controller('solicitantes')
export class SolicitantesController {

  // Constantes para manejo de paginación y formato de fechas
  private readonly PAGE_SIZE = 5;
  private readonly TIME_ZONE = 'America/Bogota';
  private readonly DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';
  private readonly DATE_BIRTH_FORMAT = 'yyyy-MM-dd';

  private readonly logger = new Logger(SolicitantesController.name);

  constructor(private readonly solicitantesService: SolicitantesService) {}

  @ApiOperation({ summary: 'Registrar un nuevo solicitante.' }) 
  @ApiBody({ type: CreateSolicitanteDto, description: 'Datos del solicitante' })
  @ApiCreatedResponse({
    description: 'Solicitante registrado correctamente',
    type: CreateApiResponseDto
  })
  @ApiBadRequestResponse({ description: 'Error de validación de datos' })
  @Post()
  async create(
    @Body() createSolicitanteDto: CreateSolicitanteDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

    const solicitanteRegistered = await this.solicitantesService.createSolicitante(createSolicitanteDto);
    this.logger.log(
      {
        solicitante: solicitanteRegistered,
        responsibleUser: { sub, username, rol },
        request: {}
      },
      'New solicitante registered'
    );
    return {
      status: 201,
      message: 'Solicitante registrado correctamente',
      data: null
    };

  }


  @ApiOperation({ summary: 'Obtener solicitantes usando filtros y paginados por cursor.' }) 
  @ApiOkResponse({
    description: 'Solicitantes obtenidos correctamente',
    type: SolicitantePaginateResponseDto
  })
  @Get()
  async findAllSolicitantes(
    @Query() query: SolcitanteQueryDto
  ) {

    // Datos del objeto query
    const {
      tipo_identificacion,
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
      tipo_identificacion,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Parsear el cursor recibido
    const parsedCursor = cursor
      ? new Date(cursor)
      : prevCursor
        ? new Date(prevCursor)
        : undefined;

    // Determinar la dirección de la paginación - si es none quiere decir que estamos en la primera página
    const direction: 'next' | 'prev' | 'none' = cursor
      ? 'next'
      : prevCursor
        ? 'prev'
        : 'none';

    // Objeto de configuración de paginación
    const pagination = {
      cursor: parsedCursor ? { fecha_registro: parsedCursor } : undefined,
      limit: this.PAGE_SIZE,
      direction
    };

    // Cadena para busqueda basada en texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    // Obtenemos los datos, cursores y reasignamos prevCursor a newPrevCursor
    const {
      solicitantes,
      nextCursor: nextCursorDate,
      prevCursor: newPrevCursorDate,
      totalRecords
    } = await this.solicitantesService.findAllSolicitantes(
      filters,
      order,
      pagination,
      formattedSearchItem
    );

    // Formateamos las fechas antes de enviarlas
    const formattedSolicitantes = solicitantes.map((solicitante) => {

      const zonedFecha_registro = new TZDate(solicitante.fecha_registro, this.TIME_ZONE);
      const zonedFecha_actualizacion = new TZDate(solicitante.fecha_actualizacion, this.TIME_ZONE);

      const formattedFecha_registro = format(zonedFecha_registro, this.DATE_FORMAT);
      const formattedFecha_actualizacion = format(zonedFecha_actualizacion, this.DATE_FORMAT);

      // Si recibimos claves anidada, combinamos todo en un objeto principal
      const formattedSolicitante = solicitante.perfilSocioeconomico 
        ? {
            ...solicitante, 
            fecha_registro: formattedFecha_registro,
            fecha_actualizacion: formattedFecha_actualizacion,
            ...solicitante.perfilSocioeconomico
          }
        : {
            ...solicitante, 
            fecha_registro: formattedFecha_registro,
            fecha_actualizacion: formattedFecha_actualizacion
          }
      
      // Se elimina la propiedad del nuevo objeto para que no quede anidada
      delete formattedSolicitante.perfilSocioeconomico;

      return formattedSolicitante;

    });

    return {
      status: 200,
      message: 'Solicitantes obtenidos correctamente',
      data: formattedSolicitantes,
      nextCursor: nextCursorDate ? nextCursorDate.toISOString() : null, // Devuelve el cursor para la siguiente página
      prevCursor: newPrevCursorDate ? newPrevCursorDate.toISOString() : null, // Devuelve el cursor para la anterior página
      pageSize: this.PAGE_SIZE,
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  @ApiOperation({ summary: 'Generar archivo de reporte con información de los solicitantes.' })
  @ApiOkResponse({
    description: 'Archivo de reporte generado correctamente',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  }) 
  @Get('/report')
  async reportSolicitantes(
    @Query() query: SolcitanteQueryDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface,
    @Res() res: Response
  ) {

    // Datos del objeto query
    const {
      tipo_identificacion,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      tipo_identificacion,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Obtenemos los datos para realizar el reporte 
    const infoReport = await this.solicitantesService.getInfoSolicitantesReport(filters);

    // Formateamos los datos con los nombres de columnas personalizadas
    const data = infoReport.map((solicitante) => ({

      'Nombre': solicitante.nombre,
      'Apellidos': solicitante.apellidos,
      'Tipo Identificación': solicitante.tipo_identificacion,
      'Número Identificación': solicitante.numero_identificacion,
      'Genero': solicitante.genero,
      'Fecha de Nacimiento': format(new UTCDate(solicitante.fecha_nacimiento), this.DATE_BIRTH_FORMAT),
      'Lugar de Nacimiento': solicitante.lugar_nacimiento,
      'Discapacidad': solicitante.discapacidad,
      'Vulnerabilidad': solicitante.vulnerabilidad,
      'Dirección Actual': solicitante.direccion_actual,
      'Correo Electrónico': solicitante.email,
      'Número de Contacto': solicitante.numero_contacto,
      'Nivel de Estudio': solicitante.perfilSocioeconomico.nivel_estudio,
      'Estrato': solicitante.perfilSocioeconomico.estrato,
      'Sisben': solicitante.perfilSocioeconomico.sisben,
      'Oficio': solicitante.perfilSocioeconomico.oficio,
      'Nivel de Igreso Económico': solicitante.perfilSocioeconomico.nivel_ingreso_economico,
      'Departamento': solicitante.perfilSocioeconomico.departamento,
      'Ciudad': solicitante.perfilSocioeconomico.ciudad,
      'Barrio': solicitante.perfilSocioeconomico.barrio

    }));

    // Definimos los anchos predefinidos para las columnas
    const columnWidths = [
      { wch: 30 }, // Nombre
      { wch: 30 }, // Apellidos
      { wch: 25 }, // Tipo Identificación
      { wch: 25 }, // Número Identificación
      { wch: 12 }, // Genero
      { wch: 25 }, // Fecha Nacimiento
      { wch: 35 }, // Lugar de Nacimiento
      { wch: 15 }, // Discapacidad
      { wch: 25 }, // Vulnerabilidad
      { wch: 35 }, // Dirección Actual
      { wch: 30 }, // Correo Electrónico
      { wch: 25 }, // Número de Contacto
      { wch: 15 }, // Nivel de Estudio
      { wch: 10 }, // Estrato
      { wch: 15 }, // Sisben
      { wch: 35 }, // Oficio
      { wch: 30 }, // Nivel de Igreso Económico
      { wch: 30 }, // Departamento
      { wch: 30 }, // Ciudad 
      { wch: 30 }, // Barrio
    ];

    // Generamos el archivo
    const excelBuffer = generateExcelReport(data, columnWidths);

    // Configuramos las cabeceras de respuesta para la descarga del archivo
    res.setHeader(
      'Content-Type', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition', 
      'attachment; filename=Reporte_Solicitantes.xlsx'
    );

    // Registramos el evento
    this.logger.log(
      {
        responsibleUser: { sub, username, rol },
        request: {}
      },
      'New solicitantes report generated'
    );

    // Enviamos el buffer como respuesta
    res.send(excelBuffer);

  }


  @ApiOperation({ summary: 'Obtener un solicitante por ID.' }) 
  @ApiParam({ name: 'id', description: 'ID del solicitante', type: String })
  @ApiNotFoundResponse({ description: 'Solicitante no encontrado' }) 
  @ApiOkResponse({
    description: 'Solicitante obtenido correctamente',
    type: SolicitanteResponseDto
  })
  @Get(':id')
  async findOne(@Param() params: validateIdParamDto) {

    const { id } = params;
    const { perfilSocioeconomico, ...solicitanteData } = await this.solicitantesService.findOneSolicitante(+id);

    // Formateamos las fecha de nacimiento antes de enviarla
    const zonedFechaNacimiento = new UTCDate(solicitanteData.fecha_nacimiento);
    const formattedSolicitante = {
      ...solicitanteData,
      fecha_nacimiento: format(zonedFechaNacimiento, this.DATE_BIRTH_FORMAT),
      ...perfilSocioeconomico
    }

    return {
      status: 200,
      message: 'Solicitante obtenido correctamente',
      data: formattedSolicitante
    };

  }


  @ApiOperation({ summary: 'Actualizar los datos de un solicitante.' })
  @ApiParam({ name: 'id', description: 'ID del solicitante', type: String })
  @ApiNotFoundResponse({ description: 'Solicitante no encontrado' })
  @ApiOkResponse({
    description: 'Solicitante actualizado correctamente',
    type: GenericApiResponseDto
  }) 
  @Patch(':id')
  async update(
    @Param() params: validateIdParamDto,
    @Body() updateSolicitanteDto: UpdateSolicitanteDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

    const { id } = params;
    const updatedUser = await this.solicitantesService.updateSolicitante(+id, updateSolicitanteDto);
    this.logger.log(
      {
        newDataUser: updateSolicitanteDto,
        responsibleUser: { sub, username, rol },
        user_updated_identifier: id,
        request: {},
      },
      `User ${updatedUser.nombre} ${updatedUser.apellidos} has been updated`,
    );
    return {
      status: 200,
      message: 'Solicitante actualizado correctamente',
      data: null,
    };

  }

}