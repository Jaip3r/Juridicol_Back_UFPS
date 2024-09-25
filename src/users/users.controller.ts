import { Controller, Get, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
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

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado' })
@Authorization([Rol.ADMIN])
@Controller('users')
export class UsersController {

  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener todos los usuarios' }) 
  @ApiOkResponse({ description: 'Usuarios obtenidos correctamente.', type: UserResponseDto, isArray: true })
  @Get()
  async findAll() {

    const users = await this.usersService.findAllUsers();
    return {
      status: 200,
      message: 'Usuarios obtenidos correctamente',
      data: users
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

  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiOkResponse({ description: 'Usuario eliminado correctamente.', type: ApiResponseDto })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Delete(':id')
  async remove(@Param() params: validateIdParamDto, @ActorUser() { sub, username, rol }: ActorUserInterface) {

    const { id } = params;
    const deletedUser = await this.usersService.removeUser(+id);
    this.logger.log({
      deletedUser,
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
