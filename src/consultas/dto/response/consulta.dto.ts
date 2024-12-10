import { ApiProperty } from "@nestjs/swagger";
import { ConsultasDto } from "./consultas.dto";


export class ConsultaInfoDto extends ConsultasDto {

    @ApiProperty({
        description: 'Tipo de consulta',
        example: 'consulta'
    })
    tipo_consulta: string;

    @ApiProperty({
        description: 'Hechos de la consulta',
        example: 'No presenta'
    })
    hechos: string;

    @ApiProperty({
        description: 'Pretensiones de la consulta',
        example: 'No presenta'
    })
    pretensiones: string;

    @ApiProperty({
        description: 'Observaciones de la consulta',
        example: 'No presenta'
    })
    observaciones: string;

    @ApiProperty({
        description: 'Nombre del accionante',
        example: 'Ricardo Tapia'
    })
    nombre_accionante: string;

    @ApiProperty({
        description: 'Teléfono del accionante',
        example: '31323232122'
    })
    telefono_accionante: string;

    @ApiProperty({
        description: 'Email del accionante',
        example: 'ricardo@mail.com'
    })
    email_accionante: string;

    @ApiProperty({
        description: 'Dirección del accionante',
        example: 'La casa de Ricardo'
    })
    direccion_accionante: string;

    @ApiProperty({
        description: 'Nombre del accionado',
        example: 'Cúcuta Deportivo'
    })
    nombre_accionado: string;

    @ApiProperty({
        description: 'Teléfono del accionado',
        example: 'No presenta'
    })
    telefono_accionado: string;

    @ApiProperty({
        description: 'Email del accionado',
        example: 'No presenta'
    })
    email_accionado: string;

    @ApiProperty({
        description: 'Dirección del accionado',
        example: 'No presenta'
    })
    direccion_accionado: string;

}