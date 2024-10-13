import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsPhoneNumber, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Discapacidad } from "../enum/discapacidad";
import { Estrato } from "../enum/estrato";
import { Genero } from "../enum/genero";
import { NivelEstudio } from "../enum/nivelEstudio";
import { NivelIngresoEconomico } from "../enum/nivelIngresoEconomico";
import { Sisben } from "../enum/sisben";
import { TipoIdentificacion } from "../enum/tipoIdentificacion";
import { Vulnerabilidad } from "../enum/vulnerabilidad";

export class CreateSolicitanteDto {

    @IsNotEmpty({ message: 'El nombre del solicitante es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El nombre del solicitante debe contener mínimo 3 carácteres.' })
    @MaxLength(25, { message: 'El nombre del solicitante ha de contener máximo 25 carácteres.' })
    nombre: string;

    @IsNotEmpty({ message: 'El apellido(s) del solicitante es requerido.' })
    @IsString()
    @MinLength(3, { message: 'El apellido(s) del solicitante debe contener mínimo 3 carácteres.' })
    @MaxLength(25, { message: 'El apellido(s) del solicitante ha de contener máximo 25 carácteres.' })
    apellidos: string;

    @IsEnum(TipoIdentificacion, { message: 'Tipo de identificación no válido.' })
    tipo_identificacion: TipoIdentificacion;

    @IsNotEmpty({ message: 'El número de identificación es requerido' })
    @IsNumberString({}, { message: 'El número de identificación debe contener solo dígitos.' })
    @MinLength(6, { message: 'El número de identificación debe contener entre 6 a 15 digitos' })
    @MaxLength(25, { message: 'El número de identificación debe contener entre 6 a 15 digitos.' })
    numero_identificacion: string;
    
    @IsEnum(Genero, { message: 'Género no válido.' })
    genero: Genero;

    @IsDateString({}, { message: 'Fecha de nacimiento no válida.' })
    fecha_nacimiento: string;

    @IsNotEmpty({ message: 'El lugar de nacimiento es requerido.' })
    @IsString()
    lugar_nacimiento: string;
    
    @IsEnum(Discapacidad, { message: 'Discapacidad no válida.' })
    discapacidad: Discapacidad;

    @IsEnum(Vulnerabilidad, { message: 'Vulnerabilidad no válida.' })
    vulnerabilidad: Vulnerabilidad;

    @IsNotEmpty({ message: 'La dirección actual es requerida.' })
    @IsString()
    direccion_actual: string;

    @IsEmail({}, { message: 'Correo electrónico no válido.' })
    @IsOptional()
    email?: string;

    @IsNotEmpty({ message: 'El número de contacto es requerido.' })
    @IsNumberString({}, { message: 'El número de contacto debe contener solo números.' })
    @IsPhoneNumber('CO', { message: 'Número de contacto no válido.' })
    numero_contacto: string;

    @IsEnum(NivelEstudio, { message: 'Nivel de estudio no válido.' })
    nivel_estudio: NivelEstudio;

    @IsEnum(Estrato, { message: 'Estrato no válido' })
    estrato: Estrato;

    @IsEnum(Sisben, { message: 'Sisben no váldio' })
    sisben: Sisben;

    @IsNotEmpty({ message: 'El oficio es requerido.' })
    @IsString()
    oficio: string;

    @IsEnum(NivelIngresoEconomico, { message: 'Nivel de ingreso económico no válido.' })
    nivel_ingreso_economico: NivelIngresoEconomico;

    @IsNotEmpty({ message: 'El departamento es requerido.' })
    @IsString()
    departamento: string;

    @IsNotEmpty({ message: 'La ciudad es requerida.' })
    @IsString()
    ciudad: string;

    @IsNotEmpty({ message: 'El barrio es requerido.' })
    @IsString()
    barrio: string;

}
