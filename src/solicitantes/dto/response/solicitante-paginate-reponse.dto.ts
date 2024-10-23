import { ApiPaginateResponseDto } from "src/common/dto/api-paginate-response.dto";
import { SolicitanteDto } from "../solicitante.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";


export class SolicitantePaginateResponseDto extends ApiPaginateResponseDto<SolicitanteDto[]> {

    @ApiProperty({ type: () => [SolicitanteDto] })
    @Type(() => SolicitanteDto)
    data: SolicitanteDto[] | null;

}