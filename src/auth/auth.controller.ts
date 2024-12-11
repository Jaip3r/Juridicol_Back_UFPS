import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Put, Res } from '@nestjs/common';
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
import { Response } from 'express';
import { Cookies } from './decorators/get-cookies.decorator';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserDto } from 'src/users/dto/user.dto';
import { RefreshTokenResponseDto } from './dto/response/refresh-token-response.dto';
import { GenericApiResponseDto } from 'src/common/dto/generic-api-response.dto';
import { Throttle } from '@nestjs/throttler';


@ApiTags('auth')
@ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
@ApiTooManyRequestsResponse({ description: 'Demasiadas solicitudes.' })
@Controller('auth')
export class AuthController {

  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService
  ) { }


  /**
   * GET /auth/profile
   * Devuelve la información asociada al perfil de usuario.
   */
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener perfil de usuario.',
    description: 'Devuelve la información asociada al perfil del usuario.' 
  })
  @ApiOkResponse({ description: 'Información del perfil obtenida correctamente.', type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Error de autenticación de usuario.' })
  @Get('profile')
  profile(
    @ActorUser() actor_user: ActorUserInterface
  ) {
    return this.authService.getProfileInfo(actor_user.sub);
  }


  /**
   * GET /auth/refresh
   * Devuelve un nuevo token de acceso.
   */
  @Public()
  @ApiOperation({ 
    summary: 'Refrescar token de acceso.',
    description: 'Genera un nuevo token de acceso a patir de un token de refresco.'
  })
  @ApiOkResponse({ description: 'Nuevo token de acceso generado exitosamente.', type: RefreshTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Error de autenticación de usuario.' })
  @ApiForbiddenResponse({ description: 'Error de validación de token.' })
  @Get('refresh')
  async refreshTokens(@Cookies("refreshToken") refreshToken: string) {
    return this.authService.handleRefreshToken(refreshToken);
  }


  /**
   * POST /auth/register
   * Crea un nuevo usuario en el sistema.
   */
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Registrar un nuevo usuario.' ,
    description: 'Crea un nuevo registro de usuario en el sistema.'
  })
  @ApiBody({ type: RegisterDto, description: 'Datos del usuario a registrar' })
  @ApiOkResponse({ description: 'Usuario registrado correctamente.', type: GenericApiResponseDto })
  @ApiBadRequestResponse({ description: 'Error de validación de datos.' })
  @ApiUnauthorizedResponse({ description: 'Error de autenticación de usuario.' })
  @ApiForbiddenResponse({ description: 'Acceso no autorizado.' })
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


  /**
   * POST /auth/login
   * Permite el ingreso al sistema
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Iniciar sesión.' ,
    description: 'Devuelve un token acceso con los datos del usuario autenticado.'
  })
  @ApiBody({ type: LoginDto, description: 'Credenciales de inicio de sesión' })
  @ApiOkResponse({ 
    description: 'Inicio de sesión exitoso.', 
    schema: {
      example: {
        status: 200,
        message: 'Bienvenido juan@ufps.edu.co',
        data: "token"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales no válidas.' })
  @Throttle({ default: { ttl: 300000, limit: 5 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {

    const loginData = await this.authService.login(loginDto, response);
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


  /**
   * POST /auth/logout
   * Maneja la finalización de la sesión en el sistema
   */
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierre de sesión.' })
  @ApiOkResponse({ description: 'Cierre de sesión exitoso.', type: GenericApiResponseDto })
  @ApiUnauthorizedResponse({ description: 'Error de autenticación.' })
  @Post('logout')
  async logout(@Cookies("refreshToken") refreshToken: string, @Res({ passthrough: true }) response: Response) {

    const logoutInfo = await this.authService.logout(refreshToken, response);
    this.logger.log({
      refreshToken,
      request: {}
    }, `User ${logoutInfo.user} has logged out successfully`);
    return {
      status: 200,
      message: logoutInfo.message,
      data: null
    }

  }


  /**
   * PATCH* /auth/change-password
   * Permite el cambio de contraseña por parte del usuario
   */
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cambio de contraseña.',
    description: 'Permite el cambio de contraseña por parte del usuario a partir del conocimiento de su contraseña actual.'
  })
  @ApiBody({ type: ChangePasswordDto, description: 'Datos para el cambio de contraseña' })
  @ApiOkResponse({ description: 'Contraseña cambiada correctamente.', type: GenericApiResponseDto })
  @ApiBadRequestResponse({ description: 'Error de validación de datos.' })
  @ApiUnauthorizedResponse({ description: 'Error de autenticación de datos.' })
  @Throttle({ default: { ttl: 180000, limit: 15 } })
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


  /**
   * POST /auth/forgot-password
   * Permite el restablecimiento de contraseña
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Solicitud de restablecimiento de contraseña.',
    description: 'Permite la solicitud de restablecimiento de contraseña por parte del usuario en caso de olvido.'
  })
  @ApiBody({ type: ForgotPasswordDto, description: 'Datos para solicitar el restablecimiento de contraseña' })
  @ApiOkResponse({ description: 'Correo enviado para restablecer la contraseña.', type: GenericApiResponseDto })
  @Throttle({ default: { ttl: 600000, limit: 5 } })
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


  /**
   * PATCH* /auth/reset-password
   * Permite el restablecimiento de contraseña de un usuario
   */
  @Public()
  @ApiOperation({ 
    summary: 'Restablecimiento de contraseña.',
    description: 'Realiza el restablecimiento de contraseña del usuario una vez hecha la solicitud.'
  })
  @ApiBody({ type: ResetPasswordDto, description: 'Datos para restablecer la contraseña' })
  @ApiOkResponse({ description: 'Contraseña restablecida correctamente.', type: GenericApiResponseDto })
  @ApiUnauthorizedResponse({ description: 'Error de validación de token de restablecimiento.' })
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
