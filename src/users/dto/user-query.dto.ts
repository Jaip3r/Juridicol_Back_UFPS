import { IsBooleanString, IsEnum, IsIn, IsOptional, IsString } from "class-validator";
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
    @IsEnum(Rol)
    rol?: Rol;

    @ApiProperty({
        description: "Área del derecho donde se desempeña el usuario",
        example: "laboral"
    })
    @IsOptional()
    @IsEnum(AreaDerecho)
    area_derecho?: AreaDerecho;
  
    @ApiProperty({
        description: "Grupo del área al que pertenece el usuario",
        example: "A"
    })
    @IsOptional()
    @IsEnum(Grupo)
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
        description: "Hace referencia a los nuevos datos a obtener en el contexto de paginación"
    })
    @IsOptional()
    @IsString()
    cursor?: string; 

    @ApiProperty({
        description: "Hace referencia a los datos anteriores en el contexto de paginación"
    })
    @IsOptional()
    @IsString()
    prevCursor?: string;

}