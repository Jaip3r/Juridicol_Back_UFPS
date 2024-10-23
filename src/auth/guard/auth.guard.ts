import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "src/common/decorators/public-routes.decorator";


@Injectable()
export class AuthGuard implements CanActivate {

    private readonly logger = new Logger(AuthGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        
        // Para acceder a los metadatos debemos proporcionar la clave bajo la cual se almacenan en el controlador
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(), // Extrae los metadatos para el controlador de ruta procesado actualmente
            context.getClass() // Metadatos del controlador de la clase 
        ]);

        // Si el recurso es público, saltamos el flujo de autenticación
        if (isPublic){
            return true;
        }

        // Obtenemos el objeto request de la solicitud http
        const request = context.switchToHttp().getRequest();

        // Extraemos el token de la solicitud y validamos su existencia
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            this.logger.warn({
                request: {}
            }, 'Authentication failed, no token provided');
            throw new UnauthorizedException('Token no válido');
        }

        // Realizamos la verificacion del token
        try {

            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: this.configService.get<string>('access_token_secret')
                }
            );
            // Asignamos el payload al objeto request para ser accesido por nuestos manejadores
            request['user'] = payload;
        } catch (error) {
            this.logger.warn({
                request: {},
                token
            }, `An invalid token has been provided: ${error.message}`);
            throw new UnauthorizedException('Token no válido');
        }

        return true;

    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authorizationHeader = request.headers.authorization || request.headers.Authorization;
        if (typeof authorizationHeader === 'string') {
            const [type, token] = authorizationHeader.split(' ') ?? [];
            return type === 'Bearer' ? token : undefined;
        }
        return undefined;
    }

}