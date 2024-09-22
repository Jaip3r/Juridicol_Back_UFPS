import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Rol } from "src/users/enum/rol.enum";


@Injectable()
export class RolesGuard implements CanActivate {

    private readonly logger = new Logger(RolesGuard.name);

    // Permite leer los metadatos adjuntos a los controladores
    constructor(private readonly reflector: Reflector){}

    canActivate(
        context: ExecutionContext
    ): boolean {

        // Para acceder a los metadatos debemos proporcionar la clave bajo la cual se almacenan en el controlador
        const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
            context.getHandler(), // Extrae los metadatos para el controlador de ruta procesado actualmente
            context.getClass() // Metadatos del controlador de la clase 
        ]);

        // Si la ruta o el controlador no tienen ningún rol asociado, cualquier usuario puede acceder a ellos
        if (!requiredRoles){
            return true;
        }

        // Obtenemos al usuario desde el objeto request
        const { user } = context.switchToHttp().getRequest();

        // Si el usuario posee el rol de administrador, se le concede acceso automáticamente
        if (user.rol === Rol.ADMIN){
            return true;
        }

        // Si el usuario no es administrador, se verifica si su rol coincide con alguno de los roles requeridos
        const hasPermissions = requiredRoles.some((rol) => user.rol === rol);

        if (!hasPermissions) {
            this.logger.warn({
                request: {},
                user: {
                    sub: user.sub,
                    username: user.username,
                    rol: user.rol
                }
            }, `User ${user.username} has no permissions to access the requested resource`);
            throw new ForbiddenException('Acceso denegado');
        }

        return true;
        
    }

}