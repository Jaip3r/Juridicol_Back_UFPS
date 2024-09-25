import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, IsString, Matches } from "class-validator";

export class ResetPasswordDto {

    @ApiProperty({ example: 'RsetToken124', description: 'Token de restablecimiento' })
    @IsNotEmpty({ message: "El token de restablecimiento no puede estar vacío" })
    @IsString({ message: "El token de restablecimiento de ser una secuencia de caracteres" })
    resetToken: string;

    @ApiProperty({ example: 'Fernando123456!', description: 'Nueva contraseña del usuario' })
    @IsNotEmpty({ message: "La nueva contraseña no puede estar vacia" })
    @IsString({ message: "La nueva contraseña debe ser una cadena de palabras" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La nueva contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial',
    })
    newPassword: string;

    @ApiProperty({ example: '9', description: 'Identificador del usuario' })
    @IsNotEmpty({ message: "El identificador del usuario no puede estar vacio" })
    @IsNumberString({}, { message: "El identificador del usuario debe ser un número" })
    userId: string;

}