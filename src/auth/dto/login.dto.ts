import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {

    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    email: string;

    @IsNotEmpty({ message: "La contraseña no puede ser vacia" })
    @IsString()
    password: string;

}