import { ApiPaginateResponseDto } from "src/common/dto/api-paginate-response.dto";
import { ArchivoDTO } from "./archivo.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";


export class ArchivoResponseDTO extends ApiPaginateResponseDto<ArchivoDTO[]> {

    @ApiProperty({ type: () => [ArchivoDTO] })
    @Type(() => ArchivoDTO)
    data: ArchivoDTO[] | null;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Archivos obtenidos correctamente' })
    message: string;

    @ApiProperty({ description: 'Siguiente cursor de la paginación', example: 'null' })
    nextCursor: string;
    
    @ApiProperty({ description: 'Cursor anterior de la paginación', example: 'null' })
    prevCursor: string;

}