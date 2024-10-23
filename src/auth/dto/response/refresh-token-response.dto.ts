import { ApiProperty } from "@nestjs/swagger";


export class RefreshTokenResponseDto {

    @ApiProperty({ example: 'newAccessToken123', description: 'Nuevo token de acceso' })
    access_token: string;

}