import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";


@Module({
    providers: [PrismaService], // Permite la inyección del servicio en otros servicios o controladores
    exports: [PrismaService] // Permite que otros módulos de la aplicación que importen este modulo use PrismaService
})
export class PrismaModule {}