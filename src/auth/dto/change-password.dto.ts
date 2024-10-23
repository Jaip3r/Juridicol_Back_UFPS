import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";


export class ChangePasswordDto {

    @ApiProperty({ example: "Fernando1234!", description: 'Contraseña actual del usuario' })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    @IsString({ message: "La contraseña debe ser una cadena de palabras" })
    oldPassword: string;

    @ApiProperty({ example: "Fernando12345!", description: 'Nueva contraseña del usuario' })
    @IsNotEmpty({ message: "La nueva contraseña no puede estar vacia" })
    @IsString({ message: "La nueva contraseña debe ser una cadena de palabras" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La nueva contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial',
    })
    newPassword: string;

}