import { IsEmail, Matches } from "class-validator";

export class ForgotPasswordDto {

    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    email: string;

}