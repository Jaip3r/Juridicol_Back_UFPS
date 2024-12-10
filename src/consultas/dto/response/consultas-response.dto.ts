import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ApiPaginateResponseDto } from "src/common/dto/api-paginate-response.dto";
import { ConsultasDto } from "./consultas.dto";


export class ConsultasResponseDto extends ApiPaginateResponseDto<ConsultasDto[]> {

    @ApiProperty({ type: () => [ConsultasDto] })
    @Type(() => ConsultasDto)
    data: ConsultasDto[] | null;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Consultas obtenidas correctamente' })
    message: string;

    @ApiProperty({ description: 'Siguiente cursor de la paginación', example: 'null' })
    nextCursor: string;
    
    @ApiProperty({ description: 'Cursor anterior de la paginación', example: 'null' })
    prevCursor: string;

}