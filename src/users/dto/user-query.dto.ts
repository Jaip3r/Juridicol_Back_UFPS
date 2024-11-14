import { IsBooleanString, IsEnum, IsIn, IsNumberString, IsOptional, IsString } from "class-validator";
import { Rol } from "../enum/rol.enum";
import { AreaDerecho } from "../enum/areaDerecho.enum";
import { Grupo } from "../enum/grupo.enum";
import { ApiProperty } from "@nestjs/swagger";

export class UsersQueryDto {

    @ApiProperty({
        description: "Rol del usuario",
        example: "estudiante"
    })
    @IsOptional()
    @IsEnum(Rol, { message: "Rol no válido" })
    rol?: Rol;

    @ApiProperty({
        description: "Área del derecho donde se desempeña el usuario",
        example: "laboral"
    })
    @IsOptional()
    @IsEnum(AreaDerecho, { message: "Área de derecho no válida" })
    area_derecho?: AreaDerecho;
  
    @ApiProperty({
        description: "Grupo del área al que pertenece el usuario",
        example: "A"
    })
    @IsOptional()
    @IsEnum(Grupo, { message: "Grupo no válido" })
    grupo?: Grupo;
  
    @ApiProperty({
        description: "Indica si el usuario se encuentra activo en el sistema",
        example: "true"
    })
    @IsOptional()
    @IsBooleanString()
    activo?: string;
  
    @ApiProperty({
        description: "Indica el orden de los elementos por fecha de registro",
        example: "desc"
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';

    @ApiProperty({
        description: "Cursor para paginación hacia adelante"
    })
    @IsOptional()
    @IsString()
    cursor?: string; 

    @ApiProperty({
        description: "Cursor para paginación hacia atrás"
    })
    @IsOptional()
    @IsString()
    prevCursor?: string;

    @ApiProperty({
        description: "Busqueda de usuario por código",
    })
    @IsOptional()
    @IsNumberString({}, { message: "Favor proporcionar solo el código del usuario" })
    searchItem?: string;

}