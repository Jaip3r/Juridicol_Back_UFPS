import { ApiProperty } from "@nestjs/swagger";


export class SolicitanteDto {

    @ApiProperty({
        description: 'Nombre del solicitante',
        example: 'Juan Hernán'
    })
    nombre: string;

    @ApiProperty({
        description: 'Apellidos del solicitante',
        example: 'Perez Bolaños'
    })
    apellidos: string;

    @ApiProperty({
        description: 'Tipo de identificación del solicitante',
        example: 'Cédula de ciudadanía'
    })
    tipo_identificacion: string;

    @ApiProperty({
        description: 'Número de identificación del solicitante',
        example: '13436742'
    })
    numero_identificacion: string;
    
    @ApiProperty({
        description: 'Genero del solicitante',
        example: 'Masculino'
    })
    genero: string;

    @ApiProperty({
        description: 'Fecha de nacimiento del solicitante',
        example: '1995-08-29'
    })
    fecha_nacimiento: string;

    @ApiProperty({
        description: 'Lugar de nacimiento del solicitante',
        example: 'Bochalema'
    })
    lugar_nacimiento: string;
    
    @ApiProperty({
        description: 'Discapacidad del solicitante',
        example: 'Ninguna'
    })
    discapacidad: string;

    @ApiProperty({
        description: 'Vulnerabilidad del solicitante',
        example: 'Ninguna'
    })
    vulnerabilidad: string;

    @ApiProperty({
        description: 'Dirección actual del solicitante',
        example: 'Universidad Francisco de Paula Santander'
    })
    direccion_actual: string;

    @ApiProperty({
        description: 'Correo del solicitante',
        example: 'juanhernan@gmail.com'
    })
    email: string;

    @ApiProperty({
        description: 'Celular del solicitante',
        example: "3145673452"
    })
    numero_contacto: string;

    @ApiProperty({
        description: 'Nivel de estudio del solicitante',
        example: 'Profesional'
    })
    nivel_estudio: string;

    @ApiProperty({
        description: 'Estrato socioeconómico del solicitante',
        example: 'Estrato 4'
    })
    estrato: string;

    @ApiProperty({
        description: 'Sisben del solicitante',
        example: 'No aplica'
    })
    sisben: string;

    @ApiProperty({
        description: 'Oficio del solicitante',
        example: 'Ganadero el vago'
    })
    oficio: string;

    @ApiProperty({
        description: 'Nivel de ingreso económico del solicitante',
        example: 'Superior a 6 SMMV'
    })
    nivel_ingreso_economico: string;

    @ApiProperty({
        description: 'Departamento de residencia del solicitante',
        example: 'Cundinamarca'
    })
    departamento: string;

    @ApiProperty({
        description: 'Ciudad de residencia del solicitante',
        example: 'Bogotá'
    })
    ciudad: string;

    @ApiProperty({
        description: 'Barrio o localidad de residencia del solicitante',
        example: 'Ciudad Bolivar'
    })
    barrio: string;

}