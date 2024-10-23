import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";


export class ForgotPasswordDto {

    @ApiProperty({ example: 'fernandosaoc@ufps.edu.co', description: 'Correo del usuario del cual se realizará la solicitud' })
    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    email: string;

}