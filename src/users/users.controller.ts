import { Controller, Get, Post, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { validateIdParamDto } from 'src/common/dto/validate-idParam.dto';

@Controller('users')
export class UsersController {

  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {

    const newUser = await this.usersService.createUser(createUserDto);
    this.logger.log({
      user: newUser,
      request: {}
    }, 'New user registered');
    return {
      status: 201,
      message: 'Usuario registrado correctamente',
      data: null
    }

  }

  @Get()
  async findAll() {

    const users = await this.usersService.findAllUsers();
    return {
      status: 200,
      message: 'Usuarios obtenidos correctamente',
      data: users
    }

  }

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

  @Patch(':id')
  async update(@Param() params: validateIdParamDto, 
    @Body() updateUserDto: UpdateUserDto) {

      const { id } = params;
      const updatedUser = await this.usersService.updateUser(+id, updateUserDto);
      this.logger.log({
        newDataUser: updateUserDto,
        user_identifier: id,
        request: {}
      }, `User ${updatedUser.email} has been updated`);
      return {
        status: 200,
        message: 'Usuario actualizado correctamente',
        data: null
      }
  
  }

  @Delete(':id')
  async remove(@Param() params: validateIdParamDto) {

    const { id } = params;
    const deletedUser = await this.usersService.removeUser(+id);
    this.logger.log({
      deletedUser,
      user_identifier: id,
      request: {}
    }, `User ${deletedUser.email} has been inactivated`);
    
    return {
      status: 200,
      message: 'Credenciales de usuario revocadas',
      data: null
    }

  }

}
