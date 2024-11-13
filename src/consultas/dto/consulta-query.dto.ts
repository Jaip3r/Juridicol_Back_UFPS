import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNumberString, IsOptional, IsString } from "class-validator";
import { AreaDerecho } from "src/users/enum/areaDerecho.enum";
import { TipoConsulta } from "../enum/tipoConsulta";
import { EstadoConsulta } from "../enum/estadoConsulta";
import { Discapacidad } from "src/solicitantes/enum/discapacidad";
import { Vulnerabilidad } from "src/solicitantes/enum/vulnerabilidad";
import { NivelEstudio } from "src/solicitantes/enum/nivelEstudio";
import { Estrato } from "src/solicitantes/enum/estrato";
import { Sisben } from "src/solicitantes/enum/sisben";



export class ConsultaQueryDTO {

    @ApiProperty({
        description: "Área del derecho de la consulta",
        example: "laboral"
    })
    @IsOptional()
    @IsEnum(AreaDerecho)
    area_derecho?: AreaDerecho;

    @ApiProperty({
        description: "Tipo de consulta",
        example: "consulta"
    })
    @IsOptional()
    @IsEnum(TipoConsulta)
    tipo_consulta?: TipoConsulta;

    @ApiProperty({
        description: "Estado de la consulta",
        example: "pendiente"
    })
    @IsOptional()
    @IsEnum(EstadoConsulta)
    estado?: EstadoConsulta;

    @ApiProperty({
        description: "Discapacidad del solicitante",
        example: "Ninguna"
    })
    @IsOptional()
    @IsEnum(Discapacidad)
    discapacidad?: Discapacidad;

    @ApiProperty({
        description: "Vulnerabilidad del solicitante",
        example: "Ninguna"
    })
    @IsOptional()
    @IsEnum(Vulnerabilidad)
    vulnerabilidad?: Vulnerabilidad;

    @ApiProperty({
        description: "Nivel de estudio del solicitante",
        example: "Profesional"
    })
    @IsOptional()
    @IsEnum(NivelEstudio)
    nivel_estudio?: NivelEstudio;

    @ApiProperty({
        description: "Estrato socioeconómico del solicitante",
        example: "Estrato 4"
    })
    @IsOptional()
    @IsEnum(Estrato)
    estrato?: Estrato;

    @ApiProperty({
        description: "Sisben del solicitante",
        example: "C1 - C18"
    })
    @IsOptional()
    @IsEnum(Sisben)
    sisben?: Sisben;

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

    @ApiProperty({
        description: "Busqueda de consulta por radicado",
    })
    @IsOptional()
    @IsString()
    searchItem?: string;

}