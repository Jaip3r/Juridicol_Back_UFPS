import { ApiProperty } from "@nestjs/swagger";


export class ArchivoDTO {

    @ApiProperty({
        description: 'Id del archivo',
        example: '1'
    })
    id: string;

    @ApiProperty({
        description: 'Nombre del archivo',
        example: 'soporte.pdf'
    })
    nombre: string;

    @ApiProperty({
        description: 'Tipo del archivo',
        example: 'anexo'
    })
    tipo: string;

    @ApiProperty({
        description: 'Fecha de carga de archivo',
        example: '07/12/2024 19:41:22'
    })
    fecha_carga: string;

    @ApiProperty({
        description: 'Fecha de actualización de archivo',
        example: '07/12/2024 19:41:22'
    })
    fecha_actualizacion: string;

}