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
    @IsEnum(AreaDerecho, { message: "Área de derecho no válida" })
    area_derecho?: AreaDerecho;

    @ApiProperty({
        description: "Tipo de consulta",
        example: "consulta"
    })
    @IsOptional()
    @IsEnum(TipoConsulta, { message: "Tipo de consulta no válido" })
    tipo_consulta?: TipoConsulta;

    @ApiProperty({
        description: "Estado de la consulta",
        example: "pendiente"
    })
    @IsOptional()
    @IsEnum(EstadoConsulta, { message: "Estado de consulta no válido" })
    estado?: EstadoConsulta;

    @ApiProperty({
        description: "Discapacidad del solicitante",
        example: "Ninguna"
    })
    @IsOptional()
    @IsEnum(Discapacidad, { message: "Discapacidad no válida" })
    discapacidad?: Discapacidad;

    @ApiProperty({
        description: "Vulnerabilidad del solicitante",
        example: "Ninguna"
    })
    @IsOptional()
    @IsEnum(Vulnerabilidad, { message: "Vulnerabilidad no válida" })
    vulnerabilidad?: Vulnerabilidad;

    @ApiProperty({
        description: "Nivel de estudio del solicitante",
        example: "Profesional"
    })
    @IsOptional()
    @IsEnum(NivelEstudio, { message: "Nivel de estudio no válido" })
    nivel_estudio?: NivelEstudio;

    @ApiProperty({
        description: "Estrato socioeconómico del solicitante",
        example: "Estrato 4"
    })
    @IsOptional()
    @IsEnum(Estrato, { message: "Estrato no válido" })
    estrato?: Estrato;

    @ApiProperty({
        description: "Sisben del solicitante",
        example: "C1 - C18"
    })
    @IsOptional()
    @IsEnum(Sisben, { message: "Sisben no válido" })
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