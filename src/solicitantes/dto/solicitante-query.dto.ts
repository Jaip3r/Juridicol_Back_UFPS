import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { TipoIdentificacion } from "../enum/tipoIdentificacion";
import { Discapacidad } from "../enum/discapacidad";
import { Vulnerabilidad } from "../enum/vulnerabilidad";
import { NivelEstudio } from "../enum/nivelEstudio";
import { Estrato } from "../enum/estrato";
import { Sisben } from "../enum/sisben";
import { ApiProperty } from "@nestjs/swagger";
import { Tipo_Solicitante } from "../enum/tipo_solicitante";


export class SolcitanteQueryDto {

  @ApiProperty({
    description: "Tipo de solicitante",
    example: "Externo"
  })
  @IsOptional()
  @IsEnum(Tipo_Solicitante)
  tipo_solicitante?: Tipo_Solicitante;

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
    description: "Orden de los datos por fecha de registro",
    example: "desc"
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiProperty({
    description: "Cursor para paginación hacia adelante",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: "Cursor para paginación hacia atrás",
  })
  @IsOptional()
  @IsString()
  prevCursor?: string;

  @ApiProperty({
    description: "Busqueda de solicitante por nombres y apellidos",
  })
  @IsOptional()
  @IsString()
  searchItem?: string;
  
}