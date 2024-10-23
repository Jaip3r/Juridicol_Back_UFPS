import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { nanoid } from 'nanoid';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';


@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService
    ){}

    
    /*---- getProfileInfo method ------*/

    getProfileInfo(id: number) {

        // Retornamos la información del usuario en el sistema
        return this.usersService.findOneUser(id);

    }


    /*---- register method ------*/

    register(data: RegisterDto) {

        // Retornamos el usuario registrado
        return this.usersService.createUser(data);

    }


    /*---- login method ------*/

    async login({ email, password }: LoginDto, res: Response) {

        // Buscamos al usuario por el email proporcionado
        const userExists = await this.usersService.findOneUserByEmail(email);

        if (!userExists || !(await bcrypt.compare(password, userExists.password)) || !userExists.activo) {
            throw new UnauthorizedException('Credenciales no válidas');
        }

        // Construimos el payload del token de acceso
        const payload = { sub: userExists.id, username: userExists.email, rol: userExists.rol };

        // Generamos el token de acceso y el refresh token en paralelo
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync({ user_id: userExists.id }, { secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'), expiresIn: '1d' })
        ]);

        // Lógica para almacenar el refresh token en la base de datos
        let existingToken = await this.prisma.refreshToken.findUnique({
            where: {
                user_id: userExists.id
            }
        });

        // Si el token ya existe, lo actualizamos
        if (existingToken) {

            await this.prisma.refreshToken.update({
                where: { id: existingToken.id },
                data: {
                    token: refreshToken
                }
            });

        } else {

            // Si no existe, creamos un nuevo refresh token
            await this.prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    user_id: userExists.id
                }
            });

        }

        // Guardamos el refresh token en una cookie HTTP-only
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000
        });

        return {
            username: userExists.email,
            access_token: accessToken
        }

    }


    /*---- logout method ------*/

    async logout(refreshToken: string, res: Response) {

        // Verificamos que se recibio el  token correctamente
        if (!refreshToken) {
            throw new UnauthorizedException('Token de refresco no identificado');
        }

        // Verificar el token y extraer el ID del usuario
        let payload = null;
        try {
         
            payload = await this.jwtService.verifyAsync(refreshToken, { secret: this.configService.get<string>('REFRESH_TOKEN_SECRET') });
            
        } catch (error) {
            throw new ForbiddenException('Token de refresco inválido o revocado');
        }

        // Verificar si el token existe en la base de datos
        const existingToken = await this.prisma.refreshToken.findUnique({
            where: { user_id: payload.user_id },
            include: { user: true }
        });

        if (!existingToken || existingToken.token !== refreshToken) {
            throw new UnauthorizedException('Token de refresco inválido o revocado');
        }

        // Eliminar el token de la BD
        await this.prisma.refreshToken.delete({
            where: { id: existingToken.id }
        });

        // Limpiamos la cookie HTPP-only en el cliente
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });

        return { 
            user: existingToken.user.email,
            message: 'Sesión finalizada correctamente' 
        };

    }


    /*---- handleRefreshToken method ------*/

    async handleRefreshToken(refreshToken: string) {

        // Verificamos que se recibio el  token correctamente
        if (!refreshToken) {
            throw new UnauthorizedException('Token de refresco no identificado');
        }

        // Validamos el refresh token
        let userInfo = null;
        try {
            userInfo = this.jwtService.verify(refreshToken, { secret: this.configService.get<string>('REFRESH_TOKEN_SECRET') });
        } catch (err) {
            throw new ForbiddenException('Token de refresco inválido o revocado');
        }

        // Si el token es válido, generamos un nuevo access token
        const user = await this.usersService.findOneUser(userInfo.user_id);

        const payload = { sub: user.id, username: user.email, rol: user.rol };
        const newAccessToken = await this.jwtService.signAsync(payload, { expiresIn: '30m' });

        // Retornamos el nuevo access token
        return { access_token: newAccessToken };

    }


    /*---- changePassword method ------*/

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


    /*---- forgotPassword method ------*/

    async forgotPassword(email: string) {

        const { message, user_name, user_lastname, reset_token, user_id } = await this.prisma.$transaction(async (prisma) => {

            // Verificamos la existencia del usuario
            const user = await this.prisma.usuario.findUnique({
                where: { email, activo: true }
            });

            // Si el usuario existe continuamos con el proceso de restablecimiento de contraseña
            if (user) {

                // Generamos el link de reset para la contraseña y una fecha de expiración
                const resetToken = nanoid(64);
                const hashedToken = await bcrypt.hash(resetToken, 11);
                const expiryDate = new Date();
                expiryDate.setHours(expiryDate.getHours() + 1);

                // Guardamos el registro de cambio de contraseña
                await prisma.resetPassword.create({
                    data: {
                        token: hashedToken,
                        fecha_expiracion: expiryDate,
                        user_id: user.id
                    }
                });

                return { 
                    user_name: user.nombres,
                    user_lastname: user.apellidos,
                    user_id: user.id,
                    reset_token: resetToken,
                    message: 'Si el usuario se encuentra registrado, recibirá un correo' 
                };

            }

            return { 
                message: 'Si el usuario se encuentra registrado, recibirá un correo' 
            };

        });

        // Intentamos enviar el correo de restablecimiento de contraseña
        if (user_name && user_lastname && reset_token && user_id) {

            try {

                await this.mailService.sendMail(
                    email,
                    this.generateResetPasswordTemplateEmail(`${user_name} ${user_lastname}`, reset_token, user_id),
                    "Solicitud de restablecimiento de contraseña"
                );
    
            } catch (error) {

                this.logger.error({
                    error_stack: error.stack,
                    request: {}
                }, `Error sending password reset email to ${email}: ${error.message}`);

                throw new InternalServerErrorException(`Error al enviar correo de restablecimiento, favor intentarlo nuevamente`);
            }

        } else {
            this.logger.warn({
                request: {}
            }, `Password reset email was not send. User ${email} not identified`);
        }

        return { message };

    }


    /*---- resetPassword method ------*/

    async resetPassword(newPassword: string, resetToken: string, userId: number) {

        return await this.prisma.$transaction(async (prisma) => {

            // Buscamos los registros de restablecimiento de contraseña válidos para el usuario
            const resetRecords = await prisma.resetPassword.findMany({
                where: {
                    user_id: userId, // Filtra por el usuario específico
                    fecha_creacion: {
                        // Ajusta el rango según la hora estimada de creación del token
                        gte: new Date(new Date().getTime() - 10 * 60 * 1000), // Busca tokens creados en los últimos 10 minutos
                        lte: new Date(new Date().getTime() + 10 * 60 * 1000), // Hasta 10 minutos en el futuro para compensar desfases de tiempo
                    },
                    fecha_expiracion: {
                        gte: new Date(), // Asegura que los tokens no hayan expirado
                    },
                },
                include: { user: true }, // Incluye la relación con el usuario
            });

            // Si no hay registros encontrados, lanzamos una excepción
            if (!resetRecords || resetRecords.length === 0) {
                throw new UnauthorizedException('Enlace de restablecimiento inválido o expirado.');
            }

            // Encuentra un registro cuyo token coincida con el token proporcionado
            let validRecord = null;
            for (const record of resetRecords) {
                if (await bcrypt.compare(resetToken, record.token)) {
                    validRecord = record;
                    break;
                }
            }

            // Si no se encuentra un registro válido, lanzamos una excepción
            if (!validRecord) {
                throw new UnauthorizedException('Enlace de restablecimiento inválido o expirado.');
            }

            // Eliminamos el registro de restablecimiento de contraseña después de verificar el token
            await prisma.resetPassword.delete({
                where: { id: validRecord.id },
            });

            // Cambiamos la contraseña del usuario
            const user = validRecord.user;
            const saltRounds = 12;
            user.password = await bcrypt.hash(newPassword, saltRounds);

            // Guardamos el cambio de contraseña
            await prisma.usuario.update({
                where: { id: user.id },
                data: { password: user.password },
            });

            return { 
                user_mail: validRecord.user.email,
                message: 'Contraseña restablecida con éxito.' 
            };

        });

    }


    // Método auxiliar encargado de generar la plantilla para el correo de recuperar contraseña
    private generateResetPasswordTemplateEmail(nombre: string, resetString: string, userId: number) {

        const redirectURL = `http://localhost:5173/reset-password/${userId}/${resetString}`;

        return {

            greeting: 'Cordial saludo',
            name: `${nombre}`,
            intro: 'Haz recibido este correo debido a que hemos registrado una solicitud de cambio de contraseña de su parte.',
            action: {
                instructions: 'Para continuar con el proceso, haz click en el botón de la parte inferior',
                button: {
                    color: '#eb343d',
                    text: 'Restablecer contraseña',
                    link: `${redirectURL}`
                }
            },
            outro: "Recuerda que este enlace caducará en 60 minutos, si no has solicitado el cambio de contraseña, por favor, ignora este mensaje",
            signature: 'Juridicol Development Team'
            
        }

    }

}
