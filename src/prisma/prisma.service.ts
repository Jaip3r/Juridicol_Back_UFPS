import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import hashPasswordExtension from "./extensions/hashPasswordExtension";


// Encapsula la lógica de conexión a la BD dentro de un servicio reutilizable
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: ['query', 'warn', 'error'],
        });
    }

    // Asegura que la conexión a la BD se realice al inicializar el módulo
    onModuleInit() {
        this.$connect() // Establece la conexión a la BD
            .then(() => this.logger.log('Connected to DB')) // Si la conexión es exitosa
            .catch((err) => this.logger.error(`Failed to connect to the database: ${err}`)); // En caso de fallas
    }

    // Cierra la conexión a la BD al destruirse el módulo o cerrar la aplicación
    onModuleDestroy() {
        this.$disconnect()
            .then(() => this.logger.log('Disconnected from DB'))
            .catch((err) => this.logger.error(`Failed to disconnect from the database: ${err}`));
    }

    // Retorna el cliente con la extensión aplicada
    get extendedUserClient() {
        return this.$extends(hashPasswordExtension);
    }

}
