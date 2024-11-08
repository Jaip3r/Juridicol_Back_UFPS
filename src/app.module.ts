import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from './common/middlewares/correlation-id.middleware';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from './common/filters/AllExceptionFilter';
import { HttpExceptionFilter } from './common/filters/HttpExceptionFilter';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { SolicitantesModule } from './solicitantes/solicitantes.module';
import { ConsultasModule } from './consultas/consultas.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import config from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config]
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            messageKey: 'message' 
          }
        },
        messageKey: 'message',
        customProps: (req: Request) => {
          return {
            correlation: req[CORRELATION_ID_HEADER]
          }
        },
        customLogLevel(req, res, error) {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
          }
          if (res.statusCode >= 500 || error) {
            return 'error';
          }
          return 'info';
        },
        customSuccessMessage(req, res, responseTime) {
          if (res.statusCode === 404) {
            return `Resource not found: ${req.method} ${req.url}`;
          }
          if (res.statusCode === 401) { 
            return `Unauthorized access attempt: ${req.method} ${req.url}`;
          }
          if (res.statusCode === 403) {
            return `Forbidden access attempt: ${req.method} ${req.url}`
          }
          return `Request Success: ${req.method} ${req.url}`;
        },
        customErrorMessage(req, res, error) {
          let message = error.message
          if (res.statusCode === 400) message = Array.isArray(error["response"].message) ? error["response"].message.join(", ") : error["message"]  
          return `Request failed: ${req.method} ${req.url} - StatusCode ${res.statusCode} - ${message}`;
        },
        customAttributeKeys: {
          req: 'request',
          res: 'response',
          err: 'error',
        }
      }
    }),
    UsersModule,
    AuthModule,
    MailModule,
    SolicitantesModule,
    ConsultasModule,
    FileUploadModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ],
})
export class AppModule implements NestModule {

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    }

}
