import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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

    getProfileInfo(id: number) {

        // Retornamos la información del usuario en el sistema
        return this.usersService.findOneUser(id);

    }

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

    async changePassword(username: string, oldPassword: string, newPassword: string) {

        // Obtenemos los datos del usuario
        const user = await this.usersService.findOneUserByEmail(username);

        if (!user) {
            throw new BadRequestException(`Usuario ${username} no identificado`);
        }

        // Comparamos que la contraseña antigua coincida con la almacenada
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);

        if (!passwordMatch) {
            throw new UnauthorizedException('La contraseña actual no coincide con la ingresada');
        }

        // Actualizamos la contraseña
        return this.usersService.updatePassword(user.id, newPassword); 

    }

}
