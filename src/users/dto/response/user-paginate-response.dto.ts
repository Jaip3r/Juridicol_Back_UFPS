import { ApiPaginateResponseDto } from "src/common/dto/api-paginate-response.dto";
import { UserDto } from "../user.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";


export class UserPaginateResponseDto extends ApiPaginateResponseDto<UserDto[]> {

    @ApiProperty({ type: () => [UserDto] })
    @Type(() => UserDto)
    data: UserDto[] | null;

}