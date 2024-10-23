import { ApiProperty } from "@nestjs/swagger";

export class CreateApiResponseDto {

    @ApiProperty({ description: 'Código de estado HTTP', example: 201 })
    status: number;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Operación exitosa' })
    message: string;

    @ApiProperty({ description: 'Datos adicionales, si los hay', example: null })
    data: any;

}