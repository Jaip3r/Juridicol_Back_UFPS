import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = 'S3_CLIENT';

export const s3ClientProvider = {
    provide: S3_CLIENT,
    useFactory: (configService: ConfigService) => {

        const endpoint = configService.get<string>('cloudflare_credentials.endpoint');
        const accessKeyId = configService.get<string>('cloudflare_credentials.access_key');
        const secretAccessKey = configService.get<string>('cloudflare_credentials.secret_access_key');

        if (!endpoint || !accessKeyId || !secretAccessKey) {
          throw new Error('Missing S3 configuration in environment variables');
        }

        return new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey }
        });

    },
    inject: [ConfigService]
}