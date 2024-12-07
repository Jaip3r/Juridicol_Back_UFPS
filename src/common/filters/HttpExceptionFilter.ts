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
        let errorDetails = {
            statusCode: status,
            method: request.method,
            path: request.url,
            message: Array.isArray(errorResponse["message"]) ? errorResponse["message"].join(", ") : errorResponse["message"] || errorMessage
        };

        // Si errorResponse es un objeto, combinamos sus propiedades con errorDetails
        if (typeof errorResponse === 'object' && errorResponse !== null) {
          errorDetails = {
            ...errorDetails,
            ...errorResponse
          };
        } else if (typeof errorResponse === 'string') {
          // Si errorResponse es una cadena, actualizamos el mensaje
          errorDetails.message = errorResponse;
        }

        if (status === 429) {
          errorDetails.message = "Demasiadas solicitudes. Intente de nuevo más tarde"
        }

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