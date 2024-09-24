import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { nanoid } from 'nanoid';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService
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


    async forgotPassword(email: string) {

        const { message, user_name, user_lastname, reset_token, user_id } = await this.prisma.$transaction(async (prisma) => {

            // Verificamos la existencia del usuario
            const user = await this.prisma.usuario.findUnique({
                where: { email }
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

        const redirectURL = `https://google.com`;

        return {

            greeting: 'Cordial saludo',
            name: `${nombre}`,
            intro: 'Haz recibido este correo debido a que hemos registrado una solicitud de cambio de contraseña de su parte.',
            action: {
                instructions: 'Para continuar con el proceso, haz click en el botón de la parte inferior',
                button: {
                    color: '#eb343d',
                    text: 'Restablecer contraseña',
                    link: `${redirectURL}/${userId}/${resetString}`
                }
            },
            outro: "Recuerda que este enlace caducará en 60 minutos, si no has solicitado el cambio de contraseña, por favor, ignora este mensaje",
            signature: 'Juridicol Development Team'
            
        }

    }

}
