import { Controller, Get, Body, Patch, Param, Logger, Query, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { validateIdParamDto } from '../common/dto/validate-idParam.dto';
import { ActorUser } from '../common/decorators/actor-user.decorator';
import { ActorUserInterface } from '../common/interfaces/actor-user.interface';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Rol } from './enum/rol.enum';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UsersQueryDto } from './dto/user-query.dto';
import { format } from 'date-fns';
import { TZDate } from "@date-fns/tz";
import { Response } from 'express';
import { generateExcelReport } from '../common/utils/generateExcelReport';
import { UserPaginateResponseDto } from './dto/response/user-paginate-response.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { GenericApiResponseDto } from '../common/dto/generic-api-response.dto';


@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado' })
@ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
@Authorization([Rol.ADMIN])
@Controller('users')
export class UsersController {

  private readonly PAGE_SIZE = 5;
  private readonly TIME_ZONE = 'America/Bogota';
  private readonly DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) { }

  @ApiOperation({ summary: 'Obtener usuarios aplicando filtros y paginados por cursor.' })
  @ApiOkResponse({
    description: 'Usuarios obtenidos correctamente',
    type: UserPaginateResponseDto
  })
  @ApiBadRequestResponse({ description: 'Error de validación de datos' })
  @Get()
  async getUsers(
    @Query() query: UsersQueryDto
  ) {

    const { rol, area_derecho, grupo, activo, order, cursor, prevCursor, searchItem } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      rol,
      area_derecho,
      grupo,
      activo: activo !== undefined ? activo === 'true' : undefined,
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
    const formattedSearchItem = searchItem ? searchItem.trim() : undefined;

    // Obtenemos los datos, cursores y reasignamos prevCursor a newPrevCursor
    const {
      users,
      nextCursor: nextCursorDate,
      prevCursor: newPrevCursorDate,
    } = await this.usersService.getUsersByFilters(filters, order, pagination, formattedSearchItem);

    // Formatear las fechas antes de enviarlas al cliente
    const formattedUsers = users.map(user => {
      const zonedDate = new TZDate(user.fecha_registro, this.TIME_ZONE);
      const formattedDate = format(zonedDate, this.DATE_FORMAT);

      return {
        ...user,
        fecha_registro: formattedDate
      };

    });

    return {
      status: 200,
      message: 'Usuarios obtenidos correctamente',
      data: formattedUsers,
      nextCursor: nextCursorDate ? nextCursorDate.toISOString() : null, // Devuelve el cursor para la siguiente página
      prevCursor: newPrevCursorDate ? newPrevCursorDate.toISOString() : null, // Devuelve el cursor para la anterior página
      pageSize: this.PAGE_SIZE
    }

  }


  @ApiOperation({ summary: 'Obtener el conteo de usuarios con filtros aplicados.' })
  @ApiOkResponse({
    description: 'Conteo de usuarios realizado correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Conteo de usuarios realizado correctamente' },
        totalRecords: { type: 'number', example: 100 }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Error de validación de datos' })
  @Get('/count')
  async countUsers(
    @Query() query: UsersQueryDto
  ) {

    const { rol, area_derecho, grupo, activo, searchItem } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      rol,
      area_derecho,
      grupo,
      activo: activo !== undefined ? activo === 'true' : undefined,
    };

    // Cadena para busqueda basada en texto
    const formattedSearchItem = searchItem ? searchItem.trim().toLowerCase() : undefined;

    // Obtenemos el conteo
    const totalRecords = await this.usersService.countUsersWithFilters(filters, formattedSearchItem);

    return {
      status: 200,
      message: 'Conteo de usuarios realizado correctamente',
      totalRecords: totalRecords ? totalRecords : 0
    };

  }


  @ApiOperation({ summary: 'Generar archivo de reporte con información de los usuarios.' })
  @ApiOkResponse({
    description: 'Archivo de reporte generado correctamente',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @Get('/report')
  async reportUsers(
    @Query() query: UsersQueryDto,
    @ActorUser() { sub, username, rol: userRole }: ActorUserInterface,
    @Res() res: Response
  ) {

    // Datos del objeto query
    const {
      rol,
      area_derecho,
      grupo,
      activo,
      order
    } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      rol,
      area_derecho,
      grupo,
      activo: activo !== undefined ? activo === 'true' : undefined
    };

    // Obtenemos los datos para realizar el reporte 
    const infoReport = await this.usersService.getInfoUsersReport(filters, order);

    // Formateamos los datos con los nombres de columnas personalizadas
    const data = infoReport.map((usuario) => ({

      'Nombres': usuario.nombres,
      'Apellidos': usuario.apellidos,
      'Celular': usuario.celular,
      'Email': usuario.email,
      'Código': usuario.codigo,
      'Rol': usuario.rol,
      'Area de derecho': usuario.area_derecho,
      'Grupo': usuario.grupo,
      'Fecha de registro': format(new TZDate(usuario.fecha_registro, this.TIME_ZONE), this.DATE_FORMAT),
      'Activo': usuario.activo ? 'SI' : 'NO'

    }));

    // Definimos los anchos predefinidos para las columnas
    const columnWidths = [
      { wch: 30 }, // Nombres
      { wch: 30 }, // Apellidos
      { wch: 15 }, // Celular
      { wch: 35 }, // Email
      { wch: 12 }, // Codigo
      { wch: 15 }, // Rol
      { wch: 15 }, // Area de derecho
      { wch: 10 }, // Grupo 
      { wch: 25 }, // Fecha de registro
      { wch: 10 } // Activo
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
        responsibleUser: { sub, username, userRole },
        request: {}
      },
      'New users report generated'
    );

    // Enviamos el buffer como respuesta
    res.send(excelBuffer);

  }


  @ApiOperation({ summary: 'Obtener un conteo de todos los usuarios registrados en el sistema agrupados por rol.' })
  @ApiOkResponse({
    description: 'Conteo de usuarios obtenido correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Conteo de usuarios obtenido correctamente' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rol: { type: 'string', example: 'administrador' },
              count: { type: 'number', example: 1 }
            }
          }
        }
      }
    }
  })
  @Get('/countUsersGroupByRol')
  async countUsersByRol() {

    const usersCount = await this.usersService.countUsersGroupByRol();

    const transformedData = usersCount.map(item => ({
      rol: item.rol,
      count: item._count._all
    }));

    return {
      status: 200,
      message: 'Conteo de usuarios obtenido correctamente',
      data: transformedData
    }

  }


  @ApiOperation({ summary: 'Obtener un usuario por ID.' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Usuario obtenido correctamente', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Get(':id')
  async findOneUserById(@Param() params: validateIdParamDto) {

    const { id } = params;
    const user = await this.usersService.getOneUser(+id);
    return {
      status: 200,
      message: 'Usuario obtenido correctamente',
      data: user
    }

  }


  @ApiOperation({ summary: 'Actualizar datos de usuario.' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiBody({ type: UpdateUserDto, description: 'Datos para actualizar el usuario' })
  @ApiOkResponse({ description: 'Usuario actualizado correctamente', type: GenericApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiBadRequestResponse({ description: 'Error de validación de datos' })
  @Patch(':id')
  async updateInfoUser(@Param() params: validateIdParamDto,
    @Body() updateUserDto: UpdateUserDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

    const { id } = params;
    const updatedUser = await this.usersService.updateUser(+id, updateUserDto);
    this.logger.log({
      newDataUser: updateUserDto,
      responsibleUser: { sub, username, rol },
      user_updated_identifier: id,
      request: {}
    }, `User ${updatedUser.email} has been updated`);
    return {
      status: 200,
      message: 'Usuario actualizado correctamente',
      data: null
    }

  }


  @ApiOperation({ summary: 'Habilitar credenciales de usuario.' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Credenciales de usuario habilitadas correctamente', type: GenericApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Patch('/enable/:id')
  async enableCredentials(@Param() params: validateIdParamDto,
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

    const { id } = params;
    const enabledUser = await this.usersService.enableUser(+id);
    this.logger.log({
      enabledUser: `${enabledUser.nombres} ${enabledUser.apellidos}`,
      responsibleUser: { sub, username, rol },
      user_enabled_identifier: id,
      request: {}
    }, `User ${enabledUser.email} credentials has been enabled`);
    return {
      status: 200,
      message: 'Credenciales de usuario habilitadas',
      data: null
    }

  }


  @ApiOperation({ summary: 'Inhabilitar credenciales de usuario.' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Credenciales de usuario inhabilitadas correctamente', type: GenericApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Patch('/disable/:id')
  async disableCredentials(@Param() params: validateIdParamDto, @ActorUser() { sub, username, rol }: ActorUserInterface) {

    const { id } = params;
    const deletedUser = await this.usersService.disableUser(+id);
    this.logger.log({
      deletedUser: `${deletedUser.nombres} ${deletedUser.apellidos}`,
      responsibleUser: { sub, username, rol },
      user_inactivated_identifier: id,
      request: {}
    }, `User ${deletedUser.email} credentials has been inactivated`);

    return {
      status: 200,
      message: 'Credenciales de usuario revocadas',
      data: null
    }

  }

}
