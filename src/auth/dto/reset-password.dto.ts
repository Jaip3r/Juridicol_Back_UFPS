import { IsNotEmpty, IsNumberString, IsString, Matches } from "class-validator";

export class ResetPasswordDto {

    @IsNotEmpty({ message: "El token de restablecimiento no puede estar vacío" })
    @IsString({ message: "El token de restablecimiento de ser una secuencia de caracteres" })
    resetToken: string;

    @IsNotEmpty({ message: "La nueva contraseña no puede estar vacia" })
    @IsString({ message: "La nueva contraseña debe ser una cadena de palabras" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La nueva contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial',
    })
    newPassword: string;

    @IsNotEmpty({ message: "El identificador del usuario no puede estar vacio" })
    @IsNumberString({}, { message: "El identificador del usuario debe ser un número" })
    userId: string;

}