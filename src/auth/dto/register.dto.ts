import { IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsPhoneNumber, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { AreaDerecho } from "../../users/enum/areaDerecho.enum";
import { Grupo } from "../../users/enum/grupo.enum";
import { Rol } from "../../users/enum/rol.enum";
import { ApiProperty } from "@nestjs/swagger";


export class RegisterDto {

    @ApiProperty({
        description: "Nombres del usuario",
        example: "Fernando Alonso"
    })
    @IsNotEmpty({ message: "El nombre(s) del usuario es requerido." })
    @IsString()
    @MinLength(3, { message: "El nombre(s) del usuario debe contener mínimo 3 carácteres." })
    @MaxLength(45, { message: "El nombre(s) del usuario ha de contener máximo 45 carácteres." })
    nombres:  string;

    @ApiProperty({
        description: "Apellidos del usuario",
        example: "Ocampos Savedra"
    })
    @IsNotEmpty({ message: "El apellido(s) del usuario es requerido." })
    @IsString()
    @MinLength(3, { message: "El apellido(s) del usuario debe contener mínimo 3 carácteres." })
    @MaxLength(55, { message: "El apellido(s) del usuario debe contener máximo 55 carácteres." })
    apellidos: string;

    @ApiProperty({
        description: "Código del usuario",
        example: "1154032"
    })
    @IsNotEmpty({ message: "El código del usuario es requerido." })
    @IsNumberString({}, { message: "El código del usuario solo puede contener números." })
    @Matches(/^\d{5}$|^\d{7}$/, { message: "El código del usuario debe contener exactamente 5 o 7 números."})
    codigo: string;

    @ApiProperty({
        description: "Email del usuario",
        example: "fernandosaoc@ufps.edu.co"
    })
    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida." })
    @Matches(/^[a-zA-Z0-9._%+-]+@ufps\.edu\.co$/, { message: "El correo debe pertenecer al dominio @ufps.edu.co." })
    @MaxLength(60, { message: "El correo no debe sobrepasar los 60 carácteres" })
    email: string;

    @ApiProperty({
        description: "Password del usuario",
        example: "Fernando1234!"
    })
    @IsNotEmpty({ message: "La contraseña del usuario es requerida." })
    @IsString({ message: "La contraseña del usuario debe ser una cadena de palabras." })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial.',
    })
    password: string;

    @ApiProperty({
        description: "Celular de contacto del usuario",
        example: "3209876012"
    })
    @IsNotEmpty({ message: "El celular del usuario no puede estar vacio." })
    @IsNumberString({}, { message: "El celular del usuario debe contener solo números." })
    @IsPhoneNumber('CO', { message: "Número de celular no válido." })
    celular: string;

    @ApiProperty({
        description: "Rol del usuario",
        enum: Rol,
        example: "estudiante"
    })
    @IsEnum(Rol, { message: "Favor especificar un valor de rol válido." })
    rol: Rol;

    @ApiProperty({
        description: "Area del derecho correspondiente al usuario",
        enum: AreaDerecho,
        example: "laboral"
    })
    @IsEnum(AreaDerecho, { message: "Favor especificar un área del derecho válida." })
    area_derecho: AreaDerecho;

    @ApiProperty({
        description: "Grupo del usuario",
        enum: Grupo,
        example: "A"
    })
    @IsEnum(Grupo, { message: "Favor especificar un valor de grupo válido." })
    grupo: Grupo;

}
