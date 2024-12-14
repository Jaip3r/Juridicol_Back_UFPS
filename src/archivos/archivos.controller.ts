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
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ArchivoResponseDTO } from "./dto/response/archivo-response.dto";
import { ConfigService } from "@nestjs/config";


@ApiTags('Archivos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Usuario no autenticado.' })
@ApiForbiddenResponse({ description: 'Acceso no autorizado.' })
@ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
@Authorization([Rol.ADMIN])
@Controller('archivos')
export class ArchivosController {

    // Constantes para manejo de paginación y formato de fechas
    private readonly PAGE_SIZE = this.configService.get<number>("pagination.page_size");
    private readonly TIME_ZONE = this.configService.get<string>("date.time_zone");
    private readonly DATE_FORMAT = this.configService.get<string>("date.date_format");

    private readonly logger = new Logger(ArchivosController.name);

    constructor(
        private readonly archivosService: ArchivosService,
        private readonly configService: ConfigService
    ) {}


    /**
     * GET /archivos/url/:id
     * Obtiene una URL de acceso para un archivo especifico.
     */
    @ApiOperation({
        summary: 'Obtener URL de acceso.',
        description: 'Obtiene una URL de acceso para un archivo especifico.'
    })
    @ApiParam({ name: 'id', description: 'ID del archivo', type: Number })
    @ApiOkResponse({
        description: 'URL de archivo obtenida correctamente.',
        schema: {
            example: {
              status: 200,
              message: 'URL de archivo obtenida correctamente.',
              url: 'url'
            }
        }
    }) 
    @ApiNotFoundResponse({ description: 'Archivo no identificado.' })
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


    /**
     * GET /archivos/consulta/:id
     * Obtiene los archivos relacionados a una consulta especifica.
     */
    @ApiOperation({
        summary: 'Listar archivos de una consulta.',
        description: 'Obtiene los archivos asociados a una consulta dado su ID.'
    })
    @ApiParam({ name: 'id', description: 'ID de la consulta', type: Number })
    @ApiOkResponse({
        description: 'Archivos obtenidos correctamente.',
        type: ArchivoResponseDTO
    }) 
    @ApiNotFoundResponse({ description: 'Consulta no identificada.' })
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


    /**
     * GET /archivos/consulta/:id/count
     * Devuelve el conteo de archivos relacionados a una consulta especifica.
     */
    @ApiOperation({
        summary: 'Conteo de archivos de una consulta.',
        description: 'Obtiene el número total de archivos asociados a una consulta.'
    })
    @ApiParam({ name: 'id', description: 'ID de la consulta', type: Number })
    @ApiOkResponse({
        description: 'Conteo obtenido correctamente.',
        schema: {
          example: {
            status: 200,
            message: 'Conteo de archivos realizado correctamente',
            totalRecords: 10
          }
        }
    })
    @ApiNotFoundResponse({ description: 'Consulta no identificada.' })
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