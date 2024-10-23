import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsPhoneNumber, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Discapacidad } from "../enum/discapacidad";
import { Estrato } from "../enum/estrato";
import { Genero } from "../enum/genero";
import { NivelEstudio } from "../enum/nivelEstudio";
import { NivelIngresoEconomico } from "../enum/nivelIngresoEconomico";
import { Sisben } from "../enum/sisben";
import { TipoIdentificacion } from "../enum/tipoIdentificacion";
import { Vulnerabilidad } from "../enum/vulnerabilidad";
import { ApiProperty } from "@nestjs/swagger";


export class CreateSolicitanteDto {

    @ApiProperty({
        description: 'Nombre del solicitante',
        example: 'Juan Hernán'
    })
    @IsNotEmpty({ message: 'El nombre del solicitante es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El nombre del solicitante debe contener mínimo 3 carácteres.' })
    @MaxLength(30, { message: 'El nombre del solicitante ha de contener máximo 30 carácteres.' })
    nombre: string;

    @ApiProperty({
        description: 'Apellidos del solicitante',
        example: 'Perez Bolaños'
    })
    @IsNotEmpty({ message: 'El apellido(s) del solicitante es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El apellido(s) del solicitante debe contener mínimo 3 carácteres.' })
    @MaxLength(35, { message: 'El apellido(s) del solicitante ha de contener máximo 35 carácteres.' })
    apellidos: string;

    @ApiProperty({
        description: 'Tipo de identificación del solicitante',
        example: 'Cédula de ciudadanía'
    })
    @IsEnum(TipoIdentificacion, { message: 'Tipo de identificación no válido.' })
    tipo_identificacion: TipoIdentificacion;

    @ApiProperty({
        description: 'Número de identificación del solicitante',
        example: '13436742'
    })
    @IsNotEmpty({ message: 'El número de identificación es requerido' })
    @IsNumberString({}, { message: 'El número de identificación debe contener solo dígitos.' })
    @MinLength(8, { message: 'El número de identificación debe contener entre 8 a 15 digitos' })
    @MaxLength(15, { message: 'El número de identificación debe contener entre 8 a 15 digitos.' })
    numero_identificacion: string;
    
    @ApiProperty({
        description: 'Genero del solicitante',
        example: 'Masculino'
    })
    @IsEnum(Genero, { message: 'Género no válido.' })
    genero: Genero;

    @ApiProperty({
        description: 'Fecha de nacimiento del solicitante',
        example: '1995-08-29'
    })
    @IsDateString({}, { message: 'Fecha de nacimiento no válida.' })
    fecha_nacimiento: string;

    @ApiProperty({
        description: 'Lugar de nacimiento del solicitante',
        example: 'Bochalema'
    })
    @IsNotEmpty({ message: 'El lugar de nacimiento es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El lugar de nacimiento debe contener minimo 3 carácteres' })
    @MaxLength(35, { message: 'El lugar de nacimiento no debe sobrepasar los 35 carácteres' })
    lugar_nacimiento: string;
    
    @ApiProperty({
        description: 'Discapacidad del solicitante',
        example: 'Ninguna'
    })
    @IsEnum(Discapacidad, { message: 'Discapacidad no válida.' })
    discapacidad: Discapacidad;

    @ApiProperty({
        description: 'Vulnerabilidad del solicitante',
        example: 'Ninguna'
    })
    @IsEnum(Vulnerabilidad, { message: 'Vulnerabilidad no válida.' })
    vulnerabilidad: Vulnerabilidad;

    @ApiProperty({
        description: 'Dirección actual del solicitante',
        example: 'Universidad Francisco de Paula Santander'
    })
    @IsNotEmpty({ message: 'La dirección actual es requerida.' })
    @IsString()
    @MinLength(5, { message: 'La dirección actual debe contener minimo 5 carácteres' })
    @MaxLength(55, { message: 'La dirección actual no debe sobrepasar los 55 carácteres' })
    direccion_actual: string;

    @ApiProperty({
        description: 'Correo del solicitante',
        example: 'juanhernan@gmail.com'
    })
    @IsEmail({}, { message: 'Correo electrónico no válido.' })
    @IsOptional()
    @MaxLength(45, { message: 'El correo electrónico no debe sobrepasar los 45 carácteres' })
    email?: string;

    @ApiProperty({
        description: 'Celular del solicitante',
        example: "3145673452"
    })
    @IsNotEmpty({ message: 'El número de contacto es requerido.' })
    @IsNumberString({}, { message: 'El número de contacto debe contener solo números.' })
    @IsPhoneNumber('CO', { message: 'Número de contacto no válido.' })
    numero_contacto: string;

    @ApiProperty({
        description: 'Nivel de estudio del solicitante',
        example: 'Profesional'
    })
    @IsEnum(NivelEstudio, { message: 'Nivel de estudio no válido.' })
    nivel_estudio: NivelEstudio;

    @ApiProperty({
        description: 'Estrato socioeconómico del solicitante',
        example: 'Estrato 4'
    })
    @IsEnum(Estrato, { message: 'Estrato no válido' })
    estrato: Estrato;

    @ApiProperty({
        description: 'Sisben del solicitante',
        example: 'No aplica'
    })
    @IsEnum(Sisben, { message: 'Sisben no váldio' })
    sisben: Sisben;

    @ApiProperty({
        description: 'Oficio del solicitante',
        example: 'Ganadero el vago'
    })
    @IsNotEmpty({ message: 'El oficio es requerido.' })
    @IsString()
    @MinLength(5, { message: 'El oficio debe contener minimo 5 carácteres' })
    @MaxLength(35, { message: 'El oficio no debe sobrepasar los 35 carácteres' })
    oficio: string;

    @ApiProperty({
        description: 'Nivel de ingreso económico del solicitante',
        example: 'Superior a 6 SMMV'
    })
    @IsEnum(NivelIngresoEconomico, { message: 'Nivel de ingreso económico no válido.' })
    nivel_ingreso_economico: NivelIngresoEconomico;

    @ApiProperty({
        description: 'Departamento de residencia del solicitante',
        example: 'Cundinamarca'
    })
    @IsNotEmpty({ message: 'El departamento es requerido.' })
    @IsString()
    @MinLength(5, { message: 'El departamento de residencia debe contener minimo 5 carácteres' })
    @MaxLength(35, { message: 'El departamento de residencia no debe sobrepasar los 35 carácteres' })
    departamento: string;

    @ApiProperty({
        description: 'Ciudad de residencia del solicitante',
        example: 'Bogotá'
    })
    @IsNotEmpty({ message: 'La ciudad es requerida.' })
    @IsString()
    @MinLength(5, { message: 'La ciudad de residencia debe contener minimo 5 carácteres' })
    @MaxLength(35, { message: 'La ciudad de residencia no debe sobrepasar los 35 carácteres' })
    ciudad: string;

    @ApiProperty({
        description: 'Barrio o localidad de residencia del solicitante',
        example: 'Ciudad Bolivar'
    })
    @IsNotEmpty({ message: 'El barrio es requerido.' })
    @IsString()
    @MinLength(5, { message: 'El barrio de residencia debe contener minimo 5 carácteres' })
    @MaxLength(35, { message: 'El barrio de residencia no debe sobrepasar los 35 carácteres' })
    barrio: string;

}