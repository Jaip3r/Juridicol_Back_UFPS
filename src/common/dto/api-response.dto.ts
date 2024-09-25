import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto {

    @ApiProperty({ example: 200, description: 'Código de estado' })
    status: number;

    @ApiProperty({ example: 'Operación exitosa', description: 'Mensaje de respuesta' })
    message: string;

    @ApiProperty({ example: null, description: 'Datos adicionales, si los hay' })
    data: any;  

}