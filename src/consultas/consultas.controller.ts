import { Controller, Get, Post, Body, Patch, Param, Logger, UseInterceptors, UploadedFiles, ParseFilePipeBuilder, HttpStatus, Query, Res, HttpCode } from '@nestjs/common';
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
import { validateIdParamDto } from 'src/common/dto/validate-idParam.dto';
import { Response } from 'express';
import { generateExcelReport } from 'src/common/utils/generateExcelReport';
import { Throttle } from '@nestjs/throttler';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { CreateApiResponseDto } from 'src/common/dto/create-api-response.dto';
import { ConsultasResponseDto } from './dto/response/consultas-response.dto';
import { ConsultaInfoResponseDto } from './dto/response/consulta-info.dto';


@ApiTags('Consultas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado.' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado.' })
@ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
@Controller('consultas')
export class ConsultasController {

  // Constantes para manejo de paginación y formato de fechas
  private readonly PAGE_SIZE = 5;
  private readonly TIME_ZONE = 'America/Bogota';
  private readonly DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

  private readonly logger = new Logger(ConsultasController.name);

  constructor(private readonly consultasService: ConsultasService) {}


  /**
   * POST /consultas
   * Crea una nueva consulta en el sistema.
   */
  @ApiOperation({ 
    summary: 'Registrar una nueva consulta.',
    description: 'Crea un nuevo registro de consulta en el sistema, con la posibilidad de adjuntar archivos PDF como anexos.'
  }) 
  @ApiBody({ 
    type: CreateConsultaDto, 
    description: 'Datos necesarios para crear la consulta, incluyendo información del solicitante y su perfil socioeconómico' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'Consulta registrada correctamente.',
    type: CreateApiResponseDto,
    example: {
      status: 201,
      message: 'Consulta ABC-12345 registrada correctamente',
      data: null
    }
  })
  @ApiBadRequestResponse({ description: 'Error de validación de datos.' })
  @ApiUnprocessableEntityResponse({ description: 'Error al subir los archivos (tamaño o tipo no válido).'})
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

  /**
   * GET /consultas
   * Obtiene una lista de consultas con filtros opcionales.
   */
  @ApiOperation({
    summary: 'Listar Consultas.',
    description: 'Obtiene una lista de consultas utilizando filtros opcionales y paginación basada en cursor.'
  })
  @ApiOkResponse({
    description: 'Consultas obtenidas correctamente',
    type: ConsultasResponseDto
  })
  @Authorization([Rol.ADMIN])
  @Get()
  async getConsultas(
    @Query() query: ConsultaQueryDTO
  ) {
    return this._getConsultasCommon(query);
  }


  /**
   * GET /consultas/count
   * Devuelve el conteo de consultas según filtros.
   */
  @ApiOperation({
    summary: 'Conteo de consultas.',
    description: 'Obtiene el número total de consultas que coinciden con los filtros proporcionados.'
  })
  @ApiOkResponse({
    description: 'Conteo obtenido correctamente.',
    schema: {
      example: {
        status: 200,
        message: 'Conteo de consultas realizado correctamente',
        totalRecords: 42
      }
    }
  })
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
      tipo_solicitante,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      limite,
      searchItem
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      tipo_solicitante,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Cadena para busqueda basada en texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    // Obtenemos el conteo
    const totalRecords = await this.consultasService.countConsultasByFilters(filters, limite, formattedSearchItem);

    return {
      status: 200,
      message: 'Conteo de consultas realizado correctamente',
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  /**
   * GET /consultas/report
   * Genera un reporte en formato Excel de las consultas que cumplen con ciertos filtros.
   */
  @ApiOperation({
    summary: 'Generar reporte de consultas.',
    description: 'Genera un archivo Excel con la información filtrada de las consultas.'
  })
  @ApiOkResponse({
    description: 'Archivo de reporte generado correctamente.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @Throttle({ default: { ttl: 180, limit: 15 } })
  @Authorization([Rol.ADMIN])
  @Get('/report')
  async reportConsultas(
    @Query() query: ConsultaQueryDTO,
    @ActorUser() { sub, username, rol }: ActorUserInterface,
    @Res() res: Response
  ) {

    // Datos del objeto query
    const {
      area_derecho,
      tipo_consulta,
      estado,
      tipo_solicitante,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      limite,
      order
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      tipo_solicitante,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato
    };

    // Obtenemos los datos para realizar el reporte 
    const infoReport = await this.consultasService.getInfoConsultasReport(filters, limite, order);
  
    // Formateamos los datos con los nombres de columnas personalizadas
    const data = infoReport.map((consulta) => ({

      'Radicado': consulta.radicado,
      'Tipo de consulta': consulta.tipo_consulta === 'asesoria_verbal' ? 'Asesoria verbal' : 'Consulta',
      'Área de derecho': consulta.area_derecho,
      'Estado': consulta.estado,
      'Tipo de solicitante': consulta.solicitante.tipo_solicitante,
      'Nombre solicitante': consulta.solicitante.nombre,
      'Apellidos solicitante': consulta.solicitante.apellidos,
      'Tipo de identificación': consulta.solicitante.tipo_identificacion,
      'Número de identificación': consulta.solicitante.numero_identificacion,
      'Nombre accionante': consulta.nombre_accionante,
      'Teléfono accionante': consulta.telefono_accionante,
      'Email accionante': consulta.email_accionante,
      'Dirección accionante': consulta.direccion_accionante,
      'Nombre accionado': consulta.nombre_accionado || 'No presenta',
      'Teléfono accionado': consulta.telefono_accionado || 'No presenta',
      'Email accionado': consulta.email_accionado || 'No presenta',
      'Dirección accionado': consulta.direccion_accionado || 'No presenta', 
      'Fecha de registro': format(new TZDate(consulta.fecha_registro, this.TIME_ZONE), this.DATE_FORMAT),
      'Nombre estudiante registro': consulta.estudiante_registro.nombres,
      'Apellidos estudiante registro': consulta.estudiante_registro.apellidos,
      'Código estudiante registro': consulta.estudiante_registro.codigo,
      'Fecha asignación': consulta.fecha_asignacion ? format(new TZDate(consulta.fecha_asignacion, this.TIME_ZONE), this.DATE_FORMAT) : 'No presenta',
      'Nombre estudiante asignado': consulta.estudiante_asignado?.nombres || 'No presenta',
      'Apellidos estudiante asignado': consulta.estudiante_asignado?.apellidos || 'No presenta',
      'Código estudiante asignado': consulta.estudiante_asignado?.codigo || 'No presenta',
      'Fecha finalización': consulta.fecha_finalizacion ? format(new TZDate(consulta.fecha_finalizacion, this.TIME_ZONE), this.DATE_FORMAT) : 'No presenta'

    }));

    // Definimos los anchos predefinidos para las columnas
    const columnWidths = [
      { wch: 15 }, // Radicado
      { wch: 20 }, // Tipo de consulta
      { wch: 20 }, // Área de derecho
      { wch: 15 }, // Estado
      { wch: 20 }, // Tipo de solicitante
      { wch: 30 }, // Nombre solicitante
      { wch: 30 }, // Apellidos solicitante
      { wch: 25 }, // Tipo de identificación
      { wch: 25 }, // Número de identificación
      { wch: 40 }, // Nombre accionante
      { wch: 25 }, // Teléfono accionante
      { wch: 30 }, // Email accionante
      { wch: 40 }, // Dirección accionante
      { wch: 40 }, // Nombre accionado
      { wch: 25 }, // Teléfono accionado
      { wch: 30 }, // Email accionado
      { wch: 40 }, // Dirección accionado
      { wch: 25 }, // Fecha de registro
      { wch: 30 }, // Nombre estudiante registro
      { wch: 30 }, // Apellido estudiante registro
      { wch: 25 }, // Código estudiante registro
      { wch: 25 }, // Fecha asignación
      { wch: 30 }, // Nombre estudiante asignado
      { wch: 30 }, // Apellidos estudiante asignado
      { wch: 25 }, // Código estudiante asignado
      { wch: 25 }  // Fecha de finalización
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
      'New consultas report generated'
    );

    // Enviamos el buffer como respuesta
    res.send(excelBuffer);

  }


  /**
   * GET /consultas/solicitante/:id
   * Obtiene las consultas relacionadas a un solicitante específico.
   */
  @ApiOperation({
    summary: 'Listar consultas de un solicitante.',
    description: 'Obtiene las consultas asociadas a un solicitante dado su ID.'
  })
  @ApiParam({ name: 'id', description: 'ID del solicitante', type: Number })
  @ApiNotFoundResponse({ description: 'Solicitante no identificado.' })
  @ApiOkResponse({
    description: 'Consultas obtenidas correctamente.',
    type: ConsultasResponseDto
  }) 
  @Authorization([Rol.ADMIN])
  @Get('/solicitante/:id')
  async getConsultasSolicitante(
    @Query() query: ConsultaQueryDTO,
    @Param() params: validateIdParamDto
  ) {

    // Identificador del solicitante
    const { id } = params;

    return this._getConsultasCommon(query, { solicitante_id: +id });

  }


  /**
   * GET /consultas/count/solicitante/:id
   * Devuelve el conteo de consultas de un solicitante específico.
   */
  @ApiOperation({
    summary: 'Conteo de consultas de un solicitante.',
    description: 'Obtiene el número total de consultas asociadas a un solicitante.'
  })
  @ApiParam({ name: 'id', description: 'ID del solicitante', type: Number })
  @ApiOkResponse({
    description: 'Conteo obtenido correctamente.',
    schema: {
      example: {
        status: 200,
        message: 'Conteo de consultas realizado correctamente',
        totalRecords: 10
      }
    }
  })
  @Authorization([Rol.ADMIN])
  @Get('/count/solicitante/:id')
  async countConsultasSolicitante(
    @Query() query: ConsultaQueryDTO,
    @Param() params: validateIdParamDto
  ) {

    // Identificador del solicitante
    const { id } = params;

    // Datos del objeto query
    const {
      area_derecho,
      tipo_consulta,
      estado
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      solicitante_id: +id
    };

    // Obtenemos el conteo
    const totalRecords = await this.consultasService.countConsultasByFilters(filters);

    return {
      status: 200,
      message: 'Conteo de consultas realizado correctamente',
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  /**
   * POST /consultas/retry/upload/:id
   * Permite reintentar la subida de anexos a una consulta existente.
   */
  @ApiOperation({
    summary: 'Reintentar carga de anexos.',
    description: 'Permite subir anexos PDF nuevamente a una consulta ya existente.'
  })
  @ApiParam({ name: 'id', description: 'ID de la consulta', type: Number })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({
    description: 'Archivos añadidos correctamente.',
    schema: {
      example: {
        status: 200,
        message: 'Archivos añadidos correctamente a la consulta',
        data: null
      }
    }
  })
  @ApiUnprocessableEntityResponse({ 
    description: 'Error al subir los archivos (tamaño o tipo no válido)'
  })
  @Authorization([Rol.ADMIN, Rol.ESTUDIANTE])
  @Post('/retry/upload/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('anexos', 6))
  async retryUploadAnexosConsulta(
    @Param() params: validateIdParamDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomUploadFileTypeValidator({
            fileType: ['application/pdf']
          })
        )
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'El tamaño máximo permitido por archivo es de 2MB' })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, fileIsRequired: true })
    ) anexos: Array<Express.Multer.File>,
    @ActorUser() actorUser: ActorUserInterface
  ) {

    // Identificador de la consulta
    const { id } = params;

    await this.consultasService.retryFileUpload(+id, actorUser, anexos);

    return {
      status: 200,
      message: 'Archivos añadidos correctamente a la consulta',
      data: null
    };

  }


  /**
   * GET /consultas/:id
   * Obtiene la información detallada de una consulta específica.
   */
  @ApiOperation({
    summary: 'Obtener detalles de una consulta.',
    description: 'Devuelve la información completa de una consulta dada su ID.'
  })
  @ApiParam({ name: 'id', description: 'ID de la consulta', type: Number })
  @ApiOkResponse({
    description: 'Información de la consulta obtenida correctamente',
    type: ConsultaInfoResponseDto
  })
  @ApiNotFoundResponse({ description: 'Consulta no identificada.' })
  @Authorization([Rol.ADMIN])
  @Get(':id')
  async getConsultaById(
    @Param() params: validateIdParamDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

    // Identificador de la consulta
    const { id } = params;

    const consulta = await this.consultasService.getInfoConsulta(+id);
    this.logger.log({
      radicadoConsulta: consulta.radicado,
      responsibleUser: { sub, username, rol },
      request: {}
    }, `User ${username} has accessed the info of the consulta: ${consulta.radicado}`);

    // Formateo de fecha
    const formattedFecha_registro = format(new TZDate(consulta.fecha_registro, this.TIME_ZONE), this.DATE_FORMAT);

    // Combinamos los datos en un solo objeto único
    const formattedConsulta = {
      ...consulta,
      fecha_registro: formattedFecha_registro,
      solicitante_tipo: consulta.solicitante.tipo_solicitante,
      solicitante_nombre: consulta.solicitante.nombre, 
      solicitante_apellidos: consulta.solicitante.apellidos, 
      solicitante_tipo_identificacion: consulta.solicitante.tipo_identificacion, 
      solicitante_numero_identificacion: consulta.solicitante.numero_identificacion, 
      estudiante_registro_nombres: consulta.estudiante_registro.nombres, 
      estudiante_registro_apellidos: consulta.estudiante_registro.apellidos, 
      estudiante_registro_codigo: consulta.estudiante_registro.codigo,
      fecha_asignacion: consulta.fecha_asignacion ? format(new TZDate(consulta.fecha_asignacion, this.TIME_ZONE), this.DATE_FORMAT) : null,
      estudiante_asignado_nombres: consulta.estudiante_asignado?.nombres ? consulta.estudiante_asignado.nombres : null,
      estudiante_asignado_apellidos: consulta.estudiante_asignado?.apellidos ? consulta.estudiante_asignado.apellidos : null,
      estudiante_asignado_codigo: consulta.estudiante_asignado?.codigo ? consulta.estudiante_asignado.codigo : null,
      fecha_finalizacion: consulta.fecha_finalizacion ? format(new TZDate(consulta.fecha_finalizacion, this.TIME_ZONE), this.DATE_FORMAT) : null
    }

    // Eliminamos las propiedades anidadas del objeto formateado
    delete formattedConsulta.solicitante;
    delete formattedConsulta.estudiante_registro;
    delete formattedConsulta.estudiante_asignado; 

    return {
      status: 200,
      message: `Información de la consulta ${consulta.radicado} obtenida correctamente`,
      data: formattedConsulta
    }

  }


  // Para cambio de area

  /*@Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultaDto: UpdateConsultaDto) {
    return this.consultasService.update(+id, updateConsultaDto);
  }*/


  // Util methods

  private async _getConsultasCommon(
    query: ConsultaQueryDTO,
    additionalFilters?: any
  ){

    // Extraemos los parametros de consulta
    const {
      area_derecho,
      tipo_consulta,
      estado,
      tipo_solicitante,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      limite,
      order,
      cursor,
      prevCursor,
      searchItem
    } = query;

    // Construimos los filtros
    const filters = {
      area_derecho,
      tipo_consulta,
      estado,
      tipo_solicitante,
      discapacidad,
      vulnerabilidad,
      nivel_estudio,
      sisben,
      estrato,
      ...additionalFilters
    };

    // Parseamos el cursor y determinamos la dirección de paginación
    const parsedCursor = cursor
    ? +cursor
    : prevCursor
      ? +prevCursor
      : undefined;

    const direction: 'next' | 'prev' | 'none' = cursor
      ? 'next'
      : prevCursor
        ? 'prev'
        : 'none';

    // Construimos la configuración de paginación
    const pagination = {
      cursor: parsedCursor ? { id: parsedCursor } : undefined,
      limit: this.PAGE_SIZE,
      direction
    };

    // Formateamos el término de busqueda por texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    // Obtenemos las consultas
    const {
      consultas,
      nextCursor: nextCursorId,
      prevCursor: prevCursorId
    } = await this.consultasService.getConsultasByFilters(
      filters,
      limite ? limite : undefined,
      order,
      pagination,
      formattedSearchItem
    );

    // Formateamos las consultas recibidas
    const formattedConsultas = consultas.map((consulta) => {

      const zonedFecha_registro = new TZDate(consulta.fecha_registro, this.TIME_ZONE);
      const formattedFecha_registro = format(zonedFecha_registro, this.DATE_FORMAT);
  
      const formattedConsulta = (consulta.solicitante && consulta.estudiante_registro)
        ? {
            ...consulta,
            fecha_registro: formattedFecha_registro,
            solicitante_tipo: consulta.solicitante.tipo_solicitante,
            solicitante_nombre: consulta.solicitante.nombre, 
            solicitante_apellidos: consulta.solicitante.apellidos, 
            solicitante_tipo_identificacion: consulta.solicitante.tipo_identificacion, 
            solicitante_numero_identificacion: consulta.solicitante.numero_identificacion, 
            estudiante_registro_nombres: consulta.estudiante_registro.nombres, 
            estudiante_registro_apellidos: consulta.estudiante_registro.apellidos, 
            estudiante_registro_codigo: consulta.estudiante_registro.codigo,
            ...(consulta.fecha_asignacion && {
              fecha_asignacion: format(new TZDate(consulta.fecha_asignacion, this.TIME_ZONE), this.DATE_FORMAT)
            }),
            ...(consulta.estudiante_asignado && {
                estudiante_asignado_nombres: consulta.estudiante_asignado.nombres,
                estudiante_asignado_apellidos: consulta.estudiante_asignado.apellidos,
                estudiante_asignado_codigo: consulta.estudiante_asignado.codigo,
            }),
            ...(consulta.fecha_finalizacion && {
                fecha_finalizacion: format(new TZDate(consulta.fecha_finalizacion, this.TIME_ZONE), this.DATE_FORMAT)
            })
          }
        : {
            ...consulta,
            fecha_registro: formattedFecha_registro,
            fecha_asignacion: consulta.fecha_asignacion ? format(new TZDate(consulta.fecha_asignacion, this.TIME_ZONE), this.DATE_FORMAT) : null,
            fecha_finalizacion: consulta.fecha_finalizacion ? format(new TZDate(consulta.fecha_finalizacion, this.TIME_ZONE), this.DATE_FORMAT) : null,
          };
  
      if (consulta.solicitante) delete formattedConsulta.solicitante;
      if (consulta.estudiante_registro) delete formattedConsulta.estudiante_registro;
      if (consulta.estudiante_asignado) delete formattedConsulta.estudiante_asignado;
  
      return formattedConsulta;

    });

    // Returnamos la respuesta
    return {
      status: 200,
      message: 'Consultas obtenidas correctamente',
      data: formattedConsultas,
      nextCursor: nextCursorId ? nextCursorId : null,
      prevCursor: prevCursorId ? prevCursorId : null,
      pageSize: this.PAGE_SIZE
    };

  }

}
