import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {

    @ApiProperty({
        description: "Supuesta dirección de correo del usuario",
        example: "fernandosaoc@ufps.edu.co"
    })
    @IsEmail({}, { message: "Favor proporcionar una dirección de correo válida" })
    email: string;

    @ApiProperty({
        description: "Supuesta contraseña del usuario",
        example: "Fernando1234!"
    })
    @IsNotEmpty({ message: "La contraseña no puede ser vacia" })
    @IsString()
    password: string;

}