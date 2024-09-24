import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as Mailgen from 'mailgen';

@Injectable()
export class MailService {

    private readonly logger = new Logger(MailService.name);

    constructor(private readonly configService: ConfigService) {
        // Configura la API Key de SendGrid usando las variables de entorno
        sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
    }

    // Método encargado del envio de correos
    async sendMail(receptor: string, mailTemplate: object, subject: string) {

        // Estructuramos el mensaje de correo
        const message = {
            to: receptor,
            from: {
                email: this.configService.get<string>('SENDGRID_SENDER_EMAIL'),
                name: this.configService.get<string>('SENDGRID_SENDER_NAME')
            },
            subject,
            text: `Correo de restablecimiento de contraseña`,
            html: this.mailGenerator(mailTemplate)
        }

        this.logger.log({
            request: {}
        }, `Sending password reset email to user ${receptor}...`);
        await sgMail.send(message);

    }

    // Método encargado de generar la plantilla para el correo
    private mailGenerator(responseBody: object) {

        const generator = new Mailgen({
            theme: "default",
            product: {
                name: "UFPS",
                link: "https://ww2.ufps.edu.co", 
                copyright: 'Copyright © 2024 UFPS. All rights reserved.',
                logo: 'https://divisist2.ufps.edu.co/public/documentos/63b79750fa95f00107f1322ae668405d.png'
            }
        });

        return generator.generate({
            body: responseBody
        });

    }

}

    


