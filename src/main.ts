import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // Prefijo global para las rutas
  app.setGlobalPrefix('api/v1/juridicol');

  // Seguridad de helmet
  app.use(helmet());

  // Logger de pino
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Aplica el middleware cookie-parser globalmente
  app.use(cookieParser());

  // Configuración de tuberia de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Corta las propiedades que no formen parte del esquema definido
      transform: true // Transforma los datos enviados por la red en objetos tipados segun sus clases DTO
    })
  )

  await app.listen(3000, () => {
    console.log(`Server listening on port 3000`);
  });
  
}
bootstrap();
