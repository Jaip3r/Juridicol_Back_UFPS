import { ApiProperty, OmitType } from "@nestjs/swagger";
import { RegisterDto } from "src/auth/dto/register.dto";

export class UserResponseDto extends OmitType(RegisterDto, ["password"]) {

    @ApiProperty({ description: "Identificador del usuario", example: "9" })
    id: number;

    @ApiProperty({ description: "Fecha de registro del usuario del usuario", example: "24/09/2024" })
    fecha_registro: string;

}