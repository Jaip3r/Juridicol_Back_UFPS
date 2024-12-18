import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto<T> {

    @ApiProperty({ description: 'Código de estado HTTP', example: 200 })
    status: number;

    @ApiProperty({ description: 'Mensaje de la respuesta', example: 'Operación exitosa' })
    message: string;

    data: T | null;
    
}