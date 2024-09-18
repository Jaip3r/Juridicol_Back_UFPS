import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { Logger } from "nestjs-pino";


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {

    // Inyectamos una instancia de logger para su uso 
    constructor(private readonly logger: Logger) {}

    // En caso de ocurrir una excepción de tipo HttpException o derivada
    catch(exception: any, host: ArgumentsHost) {

        const ctx = host.switchToHttp(); // Cambiamos el contexto a HTTP
        const response = ctx.getResponse<Response>(); // Obtenemos el objeto respuesta
        const request = ctx.getRequest<Request>(); // Obtenemos el objeto de solicitud
        const status = exception.getStatus(); // Definimos un código predefinido para este tipo de excepciones

        const errorResponse = exception.getResponse();
        const errorMessage = exception.message;

        // Formateo de los detalles del error
        const errorDetails = {
            statusCode: status,
            method: request.method,
            path: request.url,
            message: Array.isArray(errorResponse["message"]) ? errorResponse["message"].join(", ") : errorResponse["message"] || errorMessage
        };
 
        if (exception.getStatus() !== 401 && exception.getStatus() !== 403){

          // Registramos que la solicitud no se pudo procesar correctamente
          this.logger.warn({
            message: 'Request not processed correctly',
            request: {
              method: request.method,
              url: request.url
            }
          });

        }

        // Enviamos respuesta HTTP
        response
            .status(status)
            .json(errorDetails);
        
    }

}