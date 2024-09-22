import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ){}

    register(data: RegisterDto) {

        // Retornamos el usuario registrado
        return this.usersService.createUser(data);

    }

    async login({ email, password }: LoginDto) {

        // Buscamos al usuario por el email proporcionado
        const userExists = await this.usersService.findOneUserByEmail(email);

        if (!userExists || !(await bcrypt.compare(password, userExists.password)) || !userExists.activo) {
            throw new UnauthorizedException('Credenciales no válidas');
        }

        // Construimos el payload del token de acceso
        const payload = { sub: userExists.id, username: userExists.email, rol: userExists.rol };

        // Generamos el token de acceso
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            username: userExists.email,
            access_token: accessToken
        }

    }

}
