import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SolicitanteDto } from './solicitantes/dto/solicitante.dto';
import { SolicitantePaginateResponseDto } from './solicitantes/dto/response/solicitante-paginate-reponse.dto';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // Prefijo global para las rutas
  app.setGlobalPrefix('api/v1/juridicol');

  // Seguridad de helmet
  app.use(helmet());

  // Logger de pino
  const logger = app.get(Logger); 
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Habilitar CORS
  app.enableCors({
    origin: ['http://localhost:5173'],
    methods: ['POST', 'PATCH', 'DELETE', 'GET', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Aplica el middleware cookie-parser globalmente
  app.use(cookieParser());

  // Configuración de tuberia de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Corta las propiedades que no formen parte del esquema definido
      transform: true // Transforma los datos enviados por la red en objetos tipados segun sus clases DTO
    })
  );

  // Configuración Swagger
  const config = new DocumentBuilder()
    .setTitle("Juridicol App API")
    .setDescription("Documentación de la API del aplicativo Juridicol")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [SolicitantePaginateResponseDto, SolicitanteDto]
  });
  SwaggerModule.setup("docs", app, document);

  // Uso del configService
  const configService = app.get(ConfigService);

  // Mapeamos el puerto especificado
  const port = configService.get<number>("port");

  await app.listen(port, () => {
    logger.log(`Server listening on port ${port}`);
  });

}
bootstrap();
