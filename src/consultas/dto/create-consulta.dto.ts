import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { TipoConsulta } from "../enum/tipoConsulta";
import { AreaDerecho } from "src/users/enum/areaDerecho.enum";
import { CreateSolicitanteDto } from "src/solicitantes/dto/create-solicitante.dto";

export class CreateConsultaDto extends CreateSolicitanteDto {

    @ApiProperty({
        description: 'Nombre del accionante',
        example: 'Hernán Cortes'
    })
    @IsNotEmpty({ message: 'El nombre del accionante es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El nombre del accionante debe contener minimo 3 carácteres' })
    @MaxLength(70, { message: 'El nombre del accionante no debe sobrepasar los 70 carácteres' })
    nombre_accionante: string;

    @ApiProperty({
        description: 'Teléfono del accionante',
        example: '2281260'
    })
    @IsNotEmpty({ message: 'El teléfono del accionante es requerido.' })
    @IsNumberString({}, { message: 'El teléfono del accionante debe contener solo números' })
    @Matches(/^\d{7}$|^\d{10}$/, { message: 'El teléfono del accionante debe contener exactamente 7 o 10 dígitos' })
    telefono_accionante: string;

    @ApiProperty({
        description: 'Correo del accionante',
        example: 'hernancortes@mail.com'
    })
    @IsNotEmpty({ message: 'El correo del accionante es requerido.' })
    @IsString()
    @IsEmail({}, { message: 'El correo del accionante debe corresponder a una dirección de correo válida' })
    @MaxLength(50, { message: 'El correo del accionante no debe sobrepasar los 50 carácteres' })
    correo_accionante: string;

    @ApiProperty({
        description: 'Dirección de residencia del accionante',
        example: 'Banco de Bogotá'
    })
    @IsNotEmpty({ message: 'La dirección del accionante es requerida.' })
    @IsString()
    @MinLength(5, { message: 'La dirección del accionante debe contener minimo 5 carácteres' })
    @MaxLength(60, { message: 'La dirección del accionante no debe sobrepasar los 60 carácteres' })
    direccion_accionante: string;

    @ApiProperty({
        description: 'Nombre del accionado',
        example: 'Caracol TV'
    })
    @IsNotEmpty({ message: 'El nombre del accionado es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El nombre del accionado debe contener minimo 3 carácteres' })
    @MaxLength(70, { message: 'El nombre del accionado no debe sobrepasar los 70 carácteres' })
    nombre_accionado: string;

    @ApiProperty({
        description: 'Teléfono del accionado',
        example: ''
    })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsNumberString({}, { message: 'El teléfono del accionado debe contener solo números' })
    @Matches(/^\d{7}$|^\d{10}$/, { message: 'El teléfono del accionado debe contener exactamente 7 o 10 dígitos' })
    telefono_accionado?: string;

    @ApiProperty({
        description: 'Correo del accionado',
        example: ''
    })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsEmail({}, { message: 'El correo del accionado debe corresponder a una dirección de correo válida' })
    @MaxLength(50, { message: 'El correo del accionado no debe sobrepasar los 50 carácteres' })
    correo_accionado?: string;

    @ApiProperty({
        description: 'Dirección de residencia del accionado',
        example: ''
    })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @MinLength(5, { message: 'La dirección del accionado debe contener minimo 5 carácteres' })
    @MaxLength(60, { message: 'La dirección del accionado no debe sobrepasar los 60 carácteres' })
    direccion_accionado: string;

    @ApiProperty({
        description: 'Hechos relevantes de la consulta',
        example: 'Ninguno'
    })
    @IsNotEmpty({ message: 'Los hechos de la consulta son requeridos' })
    @IsString()
    @MinLength(5, { message: 'Los hechos de la consulta deben contener como mínimo 5 carácteres' })
    @MaxLength(800, { message: 'Los hechos de la consulta deben contener como máximo 800 carácteres' })
    hechos: string;

    @ApiProperty({
        description: 'Pretensiones de la consulta',
        example: 'Ninguna'
    })
    @IsNotEmpty({ message: 'Las pretensiones de la consulta son requeridas' })
    @IsString()
    @MinLength(5, { message: 'Las pretensiones de la consulta deben contener como mínimo 5 carácteres' })
    @MaxLength(800, { message: 'Las pretensiones de la consulta deben contener como máximo 800 carácteres' })
    pretensiones: string;

    @ApiProperty({
        description: 'Observaciones de la consulta',
        example: 'Ninguna'
    })
    @IsNotEmpty({ message: 'Las observaciones de la consulta son requeridas' })
    @IsString()
    @MinLength(5, { message: 'Las observaciones de la consulta deben contener como mínimo 5 carácteres' })
    @MaxLength(800, { message: 'Las observaciones de la consulta deben contener como máximo 800 carácteres' })
    observaciones: string;

    @ApiProperty({
        description: 'Tipo de consulta',
        example: 'consulta'
    })
    @IsEnum(TipoConsulta, { message: 'Tipo de consulta no válido' })
    tipo_consulta: TipoConsulta;

    @ApiProperty({
        description: 'Área del derehco de la consulta',
        example: 'laboral'
    })
    @IsEnum(AreaDerecho, { message: 'Área del derecho no válida' })
    area_derecho: AreaDerecho;

}
