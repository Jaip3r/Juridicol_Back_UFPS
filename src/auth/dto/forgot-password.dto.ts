import { IsEmail, Matches } from "class-validator";

export class ForgotPasswordDto {

    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    //@Matches(/^[a-zA-Z0-9._%+-]+@ufps\.edu\.co$/, { message: "El correo debe pertenecer al dominio @ufps.edu.co" })
    email: string;

}