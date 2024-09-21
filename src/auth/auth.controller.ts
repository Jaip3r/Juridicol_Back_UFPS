import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public-routes.decorator';

@Controller('auth')
export class AuthController {

  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {

    const userRegistered = await this.authService.register(registerDto);
    this.logger.log({
      user: userRegistered,
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

}
