import { Controller, Get, Post, Body, Patch, Param, Logger, UseInterceptors, UploadedFiles, ParseFilePipeBuilder, HttpStatus, Query, Res } from '@nestjs/common';
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


@Controller('consultas')
export class ConsultasController {

  // Constantes para manejo de paginación y formato de fechas
  private readonly PAGE_SIZE = 5;
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
  async getConsultas(
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
      limite,
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

    // Cadena para busqueda basada en texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    const {
      consultas,
      nextCursor: nextCursorId,
      prevCursor: prevCursorId
    } 
    = await this.consultasService.getConsultasByFilters(
      filters,
      limite,
      order,
      pagination,
      formattedSearchItem
    )
    
    // Formateamos las fechas antes de enviarlas
    const formattedConsultas = consultas.map((consulta) => {

      const zonedFecha_registro = new TZDate(consulta.fecha_registro, this.TIME_ZONE);
      const formattedFecha_registro = format(zonedFecha_registro, this.DATE_FORMAT);

      // Si recibimos claves anidadas, combinamos todo en un objeto principal
      const formattedConsulta = (consulta.solicitante && consulta.estudiante_registro)
        ? {

            ...consulta,
            fecha_registro: formattedFecha_registro,
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
            
          }

      // Eliminamos las propiedades anidadas del objeto formateado solo si estan presentes
      if (consulta.solicitante) delete formattedConsulta.solicitante;
      if (consulta.estudiante_registro) delete formattedConsulta.estudiante_registro;
      if (consulta.estudiante_asignado) { delete formattedConsulta.estudiante_asignado; }

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
      limite,
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
    const totalRecords = await this.consultasService.countConsultasByFilters(filters, limite, formattedSearchItem);

    return {
      status: 200,
      message: 'Conteo de consultas realizado correctamente',
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  @Authorization([Rol.ADMIN])
  @Get('/report')
  async reportSolicitantes(
    @Query() query: ConsultaQueryDTO,
    @ActorUser() { sub, username, rol }: ActorUserInterface,
    @Res() res: Response
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
      limite,
      order
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

    // Obtenemos los datos para realizar el reporte 
    const infoReport = await this.consultasService.getInfoConsultasReport(filters, limite, order);
  
    // Formateamos los datos con los nombres de columnas personalizadas
    const data = infoReport.map((consulta) => ({

      'Radicado': consulta.radicado,
      'Tipo de consulta': consulta.tipo_consulta === 'asesoria_verbal' ? 'Asesoria verbal' : 'Consulta',
      'Área de derecho': consulta.area_derecho,
      'Estado': consulta.estado,
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


  @Authorization([Rol.ADMIN])
  @Get(':id')
  async findOne(
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultaDto: UpdateConsultaDto) {
    return this.consultasService.update(+id, updateConsultaDto);
  }

}
