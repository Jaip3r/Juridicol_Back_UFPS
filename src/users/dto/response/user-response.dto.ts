import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { UserDto } from "../user.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class UserResponseDto extends ApiResponseDto<UserDto>{

    @ApiProperty({ type: () => [UserDto] })
    @Type(() => UserDto)
    data: UserDto | null;

}