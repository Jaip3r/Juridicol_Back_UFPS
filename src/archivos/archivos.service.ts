import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3_CLIENT } from 'src/storage/providers/s3-client.provider';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';


@Injectable()
export class ArchivosService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService
  ) {}

  async uploadFilesInMemory(anexos: Array<Express.Multer.File>, consulta_id: number, prisma?: Prisma.TransactionClient) {

    // Determinamos el cliente
    const client = prisma || this.prisma;

    // Especificamos el bucket de almacenamiento
    const bucket = this.configService.get<string>('cloudflare_credentials.bucket');

    // Subimos cada archivo del arreglo a cloudflare para obtener la info a registrar en la BD
    const archivosData = await Promise.all(
      anexos.map(async (file) => {

        // Definimos la clave del archivo a subir
        const fileKey = `${randomUUID()}.pdf`;

        // Confifuramos la subida
        const putCommand = new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: file.buffer,
          ContentType: 'application/pdf'
        });

        // Enviamos a cloudflare
        await this.s3Client.send(putCommand);

        // Devolvemos la información relevante para registrar en la BD
        return {
          nombre: file.originalname,
          clave: fileKey,
          tipo: file.mimetype,
          id_consulta: consulta_id
        }

      })
    );

    await client.archivo.createMany({ data: archivosData });

  }

  findOne(id: number) {
    return `This action returns a #${id} archivo`;
  }

  update(id: number) {
    return `This action updates a #${id} archivo`;
  }

  remove(id: number) {
    return `This action removes a #${id} archivo`;
  }
}
