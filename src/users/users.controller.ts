import { Controller, Get, Body, Patch, Param, Logger, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { validateIdParamDto } from 'src/common/dto/validate-idParam.dto';
import { ActorUser } from 'src/common/decorators/actor-user.decorator';
import { ActorUserInterface } from 'src/common/interfaces/actor-user.interface';
import { Authorization } from 'src/auth/decorators/auth.decorator';
import { Rol } from './enum/rol.enum';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UsersQueryDto } from './dto/user-query.dto';
import { format } from 'date-fns';
import { TZDate } from "@date-fns/tz";


@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado' })
@Authorization([Rol.ADMIN])
@Controller('users')
export class UsersController {

  PAGE_SIZE = 5; 
  TIME_ZONE = 'America/Bogota'; 
  DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener todos los usuarios' }) 
  @ApiOkResponse({ description: 'Usuarios obtenidos correctamente.', type: UserResponseDto, isArray: true })
  @Get()
  async findAll(
    @Query() query: UsersQueryDto,
  ) {

    const { rol, area_derecho, grupo, activo, order, cursor, prevCursor } = query;

    // Filtros a aplicar a la consulta
    const filters = {
      rol,
      area_derecho,
      grupo,
      activo: activo !== undefined ? activo === 'true' : undefined,
    };

    // Parsear el cursor compuesto desde una cadena JSON
    let parsedCursor = undefined;
    let direction: 'next' | 'prev' = 'next';

    if (cursor) {
      parsedCursor = JSON.parse(cursor);
      parsedCursor.fecha_registro = new Date(parsedCursor.fecha_registro);
    } else if (prevCursor) {
      parsedCursor = JSON.parse(prevCursor);
      parsedCursor.fecha_registro = new Date(parsedCursor.fecha_registro);
      direction = 'prev';
    }

    // Objeto de configuración de paginación
    const pagination = {
      cursor: parsedCursor,
      limit: this.PAGE_SIZE, 
      direction
    };

    // Obtenemos los datos, cursores y reasignamos prevCursor a newPrevCursor
    const { users, nextCursor, prevCursor: newPrevCursor, totalRecords } = await this.usersService.findAllUsers(filters, order, pagination);

    // Formatear las fechas antes de enviarlas al cliente
    const formattedUsers = users.map(user => {
      const zonedDate = new TZDate(user.fecha_registro, this.TIME_ZONE);
      const formattedDate = format(zonedDate, this.DATE_FORMAT);

      return {
        ...user,
        fecha_registro: formattedDate,
      };

    });

    return {
      status: 200,
      message: 'Usuarios obtenidos correctamente',
      data: formattedUsers,
      nextCursor: nextCursor ? JSON.stringify(nextCursor) : null, // Devuelve el cursor para la siguiente página
      prevCursor: newPrevCursor ? JSON.stringify(newPrevCursor) : null, // Devuelve el cursor para la anterior página
      pageSize: this.PAGE_SIZE,
      totalRecords: totalRecords ? totalRecords : 0
    }

  }


  @ApiOperation({ summary: 'Obtener un conteo de todos los usuarios registrados en el sistema' })
  @ApiOkResponse({ description: 'Conteo de usuarios obtenido correctamente.', type: ApiResponseDto }) 
  @Get('/count')
  async countUsers() {

    const usersCount = await this.usersService.countUsersByRol();

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


  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String }) 
  @ApiOkResponse({ description: 'Usuario obtenido correctamente.', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Get(':id')
  async findOne(@Param() params: validateIdParamDto) {

    const { id } = params;
    const user = await this.usersService.findOneUser(+id);
    return {
      status: 200,
      message: 'Usuario obtenido correctamente',
      data: user
    }

  }


  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiBody({ type: UpdateUserDto, description: 'Datos para actualizar el usuario' })
  @ApiOkResponse({ description: 'Usuario actualizado correctamente.', type: ApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Patch(':id')
  async update(@Param() params: validateIdParamDto, 
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


  @ApiOperation({ summary: 'Habilitar credenciales de usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Credenciales de usuario habilitadas correctamente.', type: ApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Patch('/enable/:id')
  async enable(@Param() params: validateIdParamDto, 
    @ActorUser() { sub, username, rol }: ActorUserInterface
  ) {

      const { id } = params;
      const enabledUser = await this.usersService.enableUser(+id);
      this.logger.log({
        enabledUser: `${enabledUser.nombres} ${enabledUser.apellidos}`,
        responsibleUser: { sub, username, rol },
        user_enabled_identifier: id,
        request: {}
      }, `User ${enabledUser.email} has been enabled`);
      return {
        status: 200,
        message: 'Credenciales de usuario habilitadas',
        data: null
      }
  
  }


  @ApiOperation({ summary: 'Inhabilitar credenciales de usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Credenciales de usuario inhabilitadas correctamente.', type: ApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Patch('/disable/:id')
  async disable(@Param() params: validateIdParamDto, @ActorUser() { sub, username, rol }: ActorUserInterface) {

    const { id } = params;
    const deletedUser = await this.usersService.disableUser(+id);
    this.logger.log({
      deletedUser: `${deletedUser.nombres} ${deletedUser.apellidos}`,
      responsibleUser: { sub, username, rol },
      user_inactivated_identifier: id,
      request: {}
    }, `User ${deletedUser.email} has been inactivated`);
    
    return {
      status: 200,
      message: 'Credenciales de usuario revocadas',
      data: null
    }

  }

}
