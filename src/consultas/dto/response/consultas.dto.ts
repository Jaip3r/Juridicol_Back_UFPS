import { ApiProperty } from "@nestjs/swagger";


export class ConsultasDto {

    @ApiProperty({
        description: 'Id de la consulta',
        example: '1'
    })
    id: number;

    @ApiProperty({
        description: 'Radicado de la consulta',
        example: 'CJPE001-20242'
    })
    radicado: string;

    @ApiProperty({
        description: 'Área de derecho de la consulta',
        example: 'laboral'
    })
    area_derecho: string;

    @ApiProperty({
        description: 'Estado actual de la consulta',
        example: 'finalizada'
    })
    estado: string;

    @ApiProperty({
        description: 'Fecha de registro de la consulta',
        example: '07/12/2024 19:41:22'
    })
    fecha_registro: string;

    @ApiProperty({
        description: 'Tipo de solicitante',
        example: 'Externo'
    })
    solicitante_tipo: string;

    @ApiProperty({
        description: 'Nombre del solicitante',
        example: 'Gerardo Kilo'
    })
    solicitante_nombre: string;

    @ApiProperty({
        description: 'Apellidos del solicitante',
        example: 'Perez Bolaños'
    })
    solicitante_apellidos: string;

    @ApiProperty({
        description: 'Tipo de identificación del solicitante',
        example: 'Cédula de ciudadanía'
    })
    solicitante_tipo_identificacion: string;

    @ApiProperty({
        description: 'Número de identificación del solicitante',
        example: '13436742'
    })
    solicitante_numero_identificacion: string;

    @ApiProperty({
        description: 'Nombres del estudiante que registró la consulta',
        example: 'Eduardo Vargas'
    })
    estudiante_registro_nombres: string;

    @ApiProperty({
        description: 'Apellidos del estudiante que registró la consulta',
        example: 'Perez Saavedra'
    })
    estudiante_registro_apellidos: string;

    @ApiProperty({
        description: 'Código del estudiante que registró la consulta',
        example: '1198965'
    })
    estudiante_registro_codigo: string;

    @ApiProperty({
        description: 'Fecha de asignación de la consulta',
        example: 'No presenta'
    })
    fecha_asignacion: string;

    @ApiProperty({
        description: 'Nombres del estudiante asignado a la consulta',
        example: 'Emanuel Ramiro'
    })
    estudiante_asignado_nombres: string;

    @ApiProperty({
        description: 'Apellidos del estudiante asignado a la consulta',
        example: 'Godinez Florez'
    })
    estudiante_asignado_apellidos: string;

    @ApiProperty({
        description: 'Código del estudiante asignado a la consulta',
        example: '1194534'
    })
    estudiante_asignado_codigo: string;

    @ApiProperty({
        description: 'Fecha de finalización de la consulta',
        example: '12/12/2024 19:41:22'
    })
    fecha_finalizacion: string

}