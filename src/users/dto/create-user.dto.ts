import { IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { AreaDerecho } from "../enum/areaDerecho.enum";
import { Grupo } from "../enum/grupo.enum";
import { Rol } from "../enum/rol.enum";


export class CreateUserDto {

    @IsNotEmpty({ message: "El nombre(s) del usuario no puede estar vacio" })
    @IsString({ message: "El nombre(s) del usuario debe ser una cadena de palabras" })
    @MinLength(3, { message: "El nombre(s) del usuario debe contener mínimo 3 carácteres" })
    @MaxLength(25, { message: "El nombre(s) del usuario ha de contener máximo 25 carácteres" })
    nombres:  string;

    @IsNotEmpty({ message: "El apellido(s) del usuario no puede estar vacio" })
    @IsString({ message: "El apellido(s) del usuario debe ser una cadena de palabras" })
    @MinLength(3, { message: "El apellido(s) del usuario debe contener mínimo 3 carácteres" })
    @MaxLength(25, { message: "El apellido(s) del usuario debe contener máximo 25 carácteres" })
    apellidos: string;

    @IsNotEmpty({ message: "El código del usuario no puede estar vacio" })
    @IsNumberString({}, { message: "El código del usuario solo puede contener números" })
    @Length(7, 7, { message: "El código del usuario debe contener exactamente 7 números" })
    codigo: string;

    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    @Matches(/^[a-zA-Z0-9._%+-]+@ufps\.edu\.co$/, { message: "El correo debe pertenecer al dominio @ufps.edu.co" })
    email: string;

    @IsNotEmpty({ message: "La contraseña del usuario no puede estar vacia" })
    @IsString({ message: "La contraseña del usuario debe ser una cadena de palabras" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial',
    })
    password: string;

    @IsNotEmpty({ message: "El celular del usuario no puede estar vacio" })
    @IsNumberString({}, { message: "El celular del usuario debe contener solo números" })
    @MinLength(7, { message: "El celular del usuario debe contener entre 7 y 10 digitos" })
    @MaxLength(10, { message: "El celular del usuario debe contener entre 7 y 10 digitos" })
    celular: string;

    @IsEnum(Rol, { message: "Favor especificar un valor de rol válido" })
    rol: Rol;

    @IsEnum(AreaDerecho, { message: "Favor especificar un área del derecho válida" })
    area_derecho: AreaDerecho;

    @IsEnum(Grupo, { message: "Favor especificar un valor de grupo válido" })
    grupo: Grupo;

}
