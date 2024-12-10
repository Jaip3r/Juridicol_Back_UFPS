import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, response, Response } from "express";
import { Logger } from "nestjs-pino";


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {

    // Inyectamos una instancia de logger para su uso 
    constructor(private readonly logger: Logger) {}

    // En caso de ocurrir una excepción de tipo HttpException o derivada
    catch(exception: HttpException, host: ArgumentsHost) {

        // Obtenemos el contexto HTTP, ya que el filtro puede aplicarse a diferentes tipos de transporte
        const ctx = host.switchToHttp(); 
        const response = ctx.getResponse<Response>(); // Obtenemos el objeto respuesta
        const request = ctx.getRequest<Request>(); // Obtenemos el objeto de solicitud

        // Obtenemos el código de estado definido en la excepción
        const status = exception.getStatus(); 

        // Obtenemos el cuerpo de la repuesta de la excepción
        const errorResponse = exception.getResponse();

        // Mensaje genérico de la excepción
        const defaultErrorMessage = exception.message;

        // Construimos el objeto con los detalles del error
        let errorDetails = {
            statusCode: status,
            method: request.method,
            path: request.url,
            message: defaultErrorMessage
        };

        // Normalizamos el mensaje principal de error en base al formato de errorResponse
        const normalizedMessage = this.normalizeErrorMessage(errorResponse, defaultErrorMessage);

        // Actualizamos errorDetails con el nuevo mensaje
        errorDetails.message = normalizedMessage;

        // Si errorResponse es un objeto, combinamos sus propiedades con errorDetails
        if (this.isObject(errorResponse)) {

          // Desestructuramos para ignorar el statusCode y message originales del errorResponse
          const { message: _ignored, statusCode: _ignoredStatus, ...otherErrorProps } = errorResponse as Record<string, any>;

          // Combinamos las propiedades restantes de errorResponse con errorDetails
          errorDetails = {
            ...otherErrorProps,
            ...errorDetails
          };

        }

        // Caso especial para el status 429 (Too Many Requests).
        if (status === HttpStatus.TOO_MANY_REQUESTS) {
          errorDetails.message = 'Demasiadas solicitudes. Intente de nuevo más tarde';
        }

        // Caso especial para códigos de estado que no sean 401 y 403
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

    // Método auxiliar para verificar si un valor es un objeto
    private isObject(value: unknown): boolean {
      return typeof value === 'object' && value !== null;
    }

    // Método auxiliar para normalizar el mensaje de error
    private normalizeErrorMessage(errorResponse: unknown, defaultMessage: string): string {

      // En caso de que errorResponse no sea un objeto
      if (!this.isObject(errorResponse)) {
        return typeof errorResponse === 'string' ? errorResponse : defaultMessage;
      }

      const errorObj = errorResponse as Record<string, any>;
      const responseMessage = errorObj.message;

      // Si es un arreglo, unimos su contenido en un string separado por comas
      if (Array.isArray(responseMessage)) {
        return responseMessage.join(', ');
      }

      // Si es una cadena, lo devolvemos tal cual
      if (typeof responseMessage === 'string') {
        return responseMessage;
      }

      return defaultMessage;

    }

}