import { ApiProperty } from "@nestjs/swagger";

export class ApiPaginateResponseDto<T> {

    @ApiProperty({ description: 'Código de estado HTTP', example: 200 })
    status: number;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Operación exitosa' })
    message: string;

    data: T | null;

    @ApiProperty({ description: 'Siguiente cursor de la paginación', example: '2024-04-27T12:34:56.789Z' })
    nextCursor: string;
    
    @ApiProperty({ description: 'Cursor anterior de la paginación', example: '2024-04-20T08:22:33.444Z' })
    prevCursor: string;

    @ApiProperty({ description: 'Tamaño de la página', example: 5 })
    pageSize: number;

}