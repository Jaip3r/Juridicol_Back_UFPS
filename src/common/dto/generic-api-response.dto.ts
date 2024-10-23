import { ApiProperty } from "@nestjs/swagger";

export class GenericApiResponseDto {

    @ApiProperty({ description: 'Código de estado HTTP', example: 200 })
    status: number;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Operación exitosa' })
    message: string;

    @ApiProperty({ description: 'Datos adicionales, si los hay', example: null })
    data: any;

}