import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { ConsultaInfoDto } from "./consulta.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";


export class ConsultaInfoResponseDto extends ApiResponseDto<ConsultaInfoDto>{

    @ApiProperty({ type: () => [ConsultaInfoDto] })
    @Type(() => ConsultaInfoDto)
    data: ConsultaInfoDto | null;

}