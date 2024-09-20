import { IsNumberString } from "class-validator";

export class validateIdParamDto {

    @IsNumberString({}, { message: "Error al serializar parámetro de ruta" })
    id: string;

}