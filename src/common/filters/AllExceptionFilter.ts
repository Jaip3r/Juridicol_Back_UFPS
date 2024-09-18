import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response, Request } from "express";
import { Logger } from "nestjs-pino";


@Catch()
export class AllExceptionFilter implements ExceptionFilter {

    // Inyectamos una instancia del logger para su uso
    constructor(private readonly logger: Logger) {}

    // En caso de ocurrir una excepcion general
    catch(exception: any, host: ArgumentsHost) {
        
        const ctx = host.switchToHttp(); // Cambiamos el contexto a HTTP
        const response = ctx.getResponse<Response>(); // Obtenemos el objeto respuesta
        const request = ctx.getRequest<Request>(); // Obtenemos el objeto de solicitud
        const status = HttpStatus.INTERNAL_SERVER_ERROR; // Definimos un código predefinido para este tipo de excepciones

        // Formateo de los detalles del error
        const errorResponse = {
            statusCode: status,
            method: request.method,
            path: request.url,
            message: exception.message || 'Internal Server Error',
        };

        // Registramos el error
        this.logger.error({
            message: 'Error interno del servidor',
            request: {
                method: request.method,
                url: request.url
            }
        });

        // Enviamos respuesta HTTP
        response
            .status(status)
            .json(errorResponse);

    }

}