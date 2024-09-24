import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public-routes.decorator';
import { ActorUser } from 'src/common/decorators/actor-user.decorator';
import { ActorUserInterface } from 'src/common/interfaces/actor-user.interface';
import { Authorization } from './decorators/auth.decorator';
import { Rol } from 'src/users/enum/rol.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {

  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService
  ) {}

  @Get('profile')
  profile(
    @ActorUser() actor_user: ActorUserInterface
  ) {
    return this.authService.getProfileInfo(actor_user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Authorization([Rol.ADMIN])
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @ActorUser() { sub, username, rol }: ActorUserInterface) {

    const userRegistered = await this.authService.register(registerDto);
    this.logger.log({
      user: userRegistered,
      responsibleUser: { sub, username, rol },
      request: {}
    }, 'New user registered');
    return {
      status: 201,
      message: 'Usuario registrado correctamente',
      data: null
    }

  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {

    const loginData = await this.authService.login(loginDto);
    this.logger.log({
      token: loginData.access_token,
      request: {}
      }, `User ${loginData.username} logged successfully`);
      return {
          status: 200,
          message: `Welcome ${loginData.username}`,
          data: loginData.access_token
      }

  }

  @Put('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @ActorUser() actor_user: ActorUserInterface) {

    const changePasswordData = await this.authService.changePassword(
      actor_user.username,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword
    );
    this.logger.log({
      user_identifier: changePasswordData.id,
      request: {}
    }, `User ${actor_user.username} has changed his/her password successfully`);
    return {
      status: 200,
      message: 'Contraseña cambiada satisfactoriamente',
      data: null
    }

  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {

    const forgotPasswordData = await this.authService.forgotPassword(forgotPasswordDto.email);
    this.logger.log({
      user_email: forgotPasswordDto.email,
      request: {}
    }, `User ${forgotPasswordDto.email} has requested a password change`);
    return {
      status: 200,
      message: forgotPasswordData.message,
      data: null
    }

  }

  @Public()
  @Put('reset-password')
  async resetPassword(@Body() { newPassword, resetToken, userId }: ResetPasswordDto) {

    const resetPasswordData = await this.authService.resetPassword(
      newPassword,
      resetToken,
      +userId
    );
    this.logger.log({
      resetToken,
      request: {}
    }, `User ${resetPasswordData.user_mail} has succesfully reset his password`);
    return {
      status: 200,
      message: resetPasswordData.message,
      data: null
    }

  }

}
