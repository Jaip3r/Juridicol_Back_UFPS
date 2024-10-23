import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { SolicitanteDto } from "../solicitante.dto";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class SolicitanteResponseDto extends ApiResponseDto<SolicitanteDto>{

    @ApiProperty({ type: () => [SolicitanteDto] })
    @Type(() => SolicitanteDto)
    data: SolicitanteDto | null;

}