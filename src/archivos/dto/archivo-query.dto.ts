import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNumberString, IsOptional } from "class-validator";
import { TipoAnexo } from "../enum/tipoAnexo";


export class ArchivoQueryDto {

    @ApiProperty({
        description: "Tipo de anexo",
        example: "anexo"
    })
    @IsOptional()
    @IsEnum(TipoAnexo, { message: "Tipo de anexo no válido" })
    tipo_anexo: TipoAnexo;

    @ApiProperty({
        description: "Orden de los datos por id",
        example: "desc"
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';

    @ApiProperty({
        description: "Cursor para paginación hacia adelante",
    })
    @IsOptional()
    @IsNumberString({}, { message: "El cursor debe corresponder a un número" })
    cursor?: string;

    @ApiProperty({
        description: "Cursor para paginación hacia atrás",
    })
    @IsOptional()
    @IsNumberString({}, { message: "El cursor previo debe corresponder a un número" })
    prevCursor?: string;

}