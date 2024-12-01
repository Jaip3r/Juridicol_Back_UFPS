import { Controller, Get, Logger, Param, Query } from "@nestjs/common";
import { Authorization } from "../auth/decorators/auth.decorator";
import { Rol } from "../users/enum/rol.enum";
import { ArchivosService } from "./archivos.service";
import { validateIdParamDto } from "../common/dto/validate-idParam.dto";
import { ArchivoQueryDto } from "./dto/archivo-query.dto";
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { ActorUser } from "src/common/decorators/actor-user.decorator";
import { ActorUserInterface } from "src/common/interfaces/actor-user.interface";


@Authorization([Rol.ADMIN])
@Controller('archivos')
export class ArchivosController {

    // Constantes para manejo de paginación y formato de fechas
    private readonly PAGE_SIZE = 5;
    private readonly TIME_ZONE = 'America/Bogota';
    private readonly DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

    private readonly logger = new Logger(ArchivosController.name);

    constructor(private readonly archivosService: ArchivosService) {}

    @Get('/url/:id')
    async getUrlArchivo(
        @Param() params: validateIdParamDto
    ) {

        // Identificador del archivo
        const { id } = params;

        // Obtenemos una url prefirmada que permita acceder al archivo
        const urlFile = await this.archivosService.getArchivoPresignedURL(+id);

        return {
            status: 200,
            message: 'URL de arhivo obtenida correctamente',
            url: urlFile
        };
        
    }


    @Get('/consulta/:id')
    async getArchivosConsulta(
        @Param() params: validateIdParamDto,
        @Query() query: ArchivoQueryDto,
        @ActorUser() {sub, username, rol} : ActorUserInterface
    ) {

        // Identificador de la consulta
        const { id } = params;

        // Datos del objeto query
        const {
            tipo_anexo,
            order,
            cursor,
            prevCursor
        } = query;
    
        // Parseamos el cursor recibido
        const parsedCursor = cursor
            ? +cursor
            : prevCursor
            ? +prevCursor
            : undefined;
        
        // Determinar la dirección de la paginación - si es none quiere decir que estamos en la primera página
        const direction: 'next' | 'prev' | 'none' = cursor
            ? 'next'
                : prevCursor
            ? 'prev'
                : 'none';
        
        // Objeto de configuración de paginación
        const pagination = {
            cursor: parsedCursor ? { id: parsedCursor } : undefined,
            limit: this.PAGE_SIZE,
            direction
        };

        const {
            archivos,
            nextCursor: nextCursorId,
            prevCursor: prevCursorId
        }
            = await this.archivosService.getArcvhivosByConsulta(
                tipo_anexo,
                order,
                pagination,
                +id
            );

        // Formateamos las fechas antes de enviarlas
        const formattedArchivos = archivos.map((archivo) => {

            const zonedFecha_registro = new TZDate(archivo.fecha_carga, this.TIME_ZONE);
            const zonedFecha_actualizacion = new TZDate(archivo.fecha_actualizacion, this.TIME_ZONE);

            const formattedFecha_registro = format(zonedFecha_registro, this.DATE_FORMAT);
            const formattedFecha_actualizacion = format(zonedFecha_actualizacion, this.DATE_FORMAT);

            // Si recibimos claves anidada, combinamos todo en un objeto principal
            const formattedArchivo = {
                ...archivo,
                fecha_carga: formattedFecha_registro,
                fecha_actualizacion: formattedFecha_actualizacion
            }

            return formattedArchivo;

        });

        // Registramos el evento
        this.logger.log(
            {
                responsibleUser: { sub, username, rol },
                request: {}
            },
            'New consultas file access registered'
        );

        return {
            status: 200,
            message: 'Archivos obtenidos correctamente',
            data: formattedArchivos,
            nextCursor: nextCursorId ? nextCursorId : null, // Devuelve el cursor para la siguiente página
            prevCursor: prevCursorId ? prevCursorId : null, // Devuelve el cursor para la anterior página
            pageSize: this.PAGE_SIZE
        };

    }


    @Get('/consulta/:id/count')
    async countArchivos(
        @Param() params: validateIdParamDto,
        @Query() query: ArchivoQueryDto
    ) {

        // Identificador de la consulta
        const { id } = params;

        // Datos del objeto query
        const {
            tipo_anexo
        } = query;

        // Obtenemos el conteo
        const totalRecords = await this.archivosService.countArchivosByConsulta(tipo_anexo, +id);

        return {
            status: 200,
            message: 'Conteo de archivos realizado correctamente',
            totalRecords: totalRecords ? totalRecords : 0
        };

    }

}