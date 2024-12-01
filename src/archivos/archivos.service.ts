import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3_CLIENT } from '../storage/providers/s3-client.provider';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TipoAnexo } from './enum/tipoAnexo';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


@Injectable()
export class ArchivosService {

  private readonly logger = new Logger(ArchivosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService
  ) {}


  /*---- uploadFiles method ------*/

  async uploadFiles(anexos: Array<Express.Multer.File>, consulta_id: number, radicado: string) {

    // Especificamos el bucket de almacenamiento
    const bucket = this.configService.get<string>('cloudflare_credentials.bucket');
  
    // Mapeamos cada archivo a una promesa de subida
    const uploadPromises = anexos.map(async (file) => {

        // Definimos la clave del archivo a subir
        const fileKey = `$${radicado}-${file.originalname}-${randomUUID()}.pdf`;

        // Confifuramos la subida
        const putCommand = new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: file.buffer,
          ContentType: 'application/pdf'
        });

        // Enviamos a cloudflare
        await this.s3Client.send(putCommand);

        // Retornamos los datos necesarios para la inserción en la base de datos
        return {
          nombre: file.originalname,
          clave: fileKey,
          tipo: TipoAnexo.anexo,
          id_consulta: consulta_id,
        };

    });

    // Ejecutamos todas las subidas en paralelo y esperamos a que terminen
    const results = await Promise.allSettled(uploadPromises);
    
    // Separamamos las subidas exitosas y fallidas
    const successfulUploads = results.filter((result) => result.status === 'fulfilled');
    const failedUploads = results.filter((result) => result.status === 'rejected');

    // Si hubo subidas fallidas, las manejamos
    if (failedUploads.length > 0) {

      // Si hubo subidas exitosas, eliminamos los archivos que se subieron
      if (successfulUploads.length > 0) {

        try {

          const deleteParams = {
            Bucket: bucket,
            Delete: {
              Objects: successfulUploads.map((file) => ({ Key: file.value.clave })),
            }
          };
          const deleteCommand = new DeleteObjectsCommand(deleteParams);
          await this.s3Client.send(deleteCommand);
          
        } catch (deleteError) {
          this.logger.error({
            request: {}
          }, `Error al eliminar los archivos: ${deleteError.message}`, deleteError.stack);
        }

      }
      
      // Obtener el primer error para lanzar como excepción
      throw failedUploads[0].reason;

    }

    // Si todas las subidas fueron exitosas, insertamos los registros en la base de datos
    const archivosData = successfulUploads.map((result) => result.value);
    await this.prisma.archivo.createMany({ data: archivosData });

  }


  /*---- getArchivosByConsulta method ------*/

  async getArcvhivosByConsulta(
    tipo_anexo: TipoAnexo,
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    id_consulta: number
  ) {

    // Obtenemos el limite y dirección del objeto de paginación
    const { cursor, limit, direction } = pagination;

    // Configuramos el cursor para la paginación
    const queryCursor = cursor
      ? { id: cursor.id }
      : undefined;

    // Obtenemos los archivos que pertenezcan a la consulta proporcionada y que cumplen con los parametros de filtro
    // Luego paginamos los registros usando paginación basada en cursor
    const archivos = await this.prisma.archivo.findMany({
      take: (direction === 'prev' ? -1 : 1) * (limit + 1),
      skip: cursor ? 1 : 0,
      cursor: queryCursor,
      select: {
        id: true,
        nombre: true,
        tipo: true,
        fecha_carga: true,
        fecha_actualizacion: true
      },
      where: {
        tipo: tipo_anexo,
        id_consulta
      },
      orderBy: [{ id: order }]
    });

    // Si no hay registros, devolvemos vacío
    if (archivos.length === 0) {
      return {
        archivos: [],
        nextCursor: null,
        prevCursor: null
      };
    }

    // Dependiendo de la dirección de paginación, usamos el elemento extra consultado
    const definedArchivos =
      direction === 'prev'
        ? archivos.slice(-limit)
        : archivos.slice(0, limit);

    // Verificación de si hay más elementos por paginar
    const hasMore = archivos.length > limit;

    // Determinamos los valores de nuestros nuevos cursores
    let nextCursor =
      direction === 'prev' || hasMore
        ? definedArchivos.at(-1).id
        : undefined;

    let prevCursor =
      direction === 'next' || (direction === 'prev' && hasMore)
        ? definedArchivos.at(0).id
        : undefined;

    return {
      archivos: definedArchivos,
      nextCursor,
      prevCursor
    };

  }


  /*---- countArchivosByConsulta method ------*/

  countArchivosByConsulta(tipo_anexo: TipoAnexo, consulta_id: number) {
    
    // Obtenemos el total de registros asociados a dicha consulta que coinciden con los filtros
    return this.prisma.archivo.count({
      where: {
        tipo: tipo_anexo,
        id_consulta: consulta_id
      }
    });

  }


  /*---- getArchivoPresignedURL method ------*/

  async getArchivoPresignedURL(id: number) {

    // Verificamos la existencia del archivo
    const archivoExist = await this.prisma.archivo.findUnique({
      where: {
        id
      }
    });

    if (!archivoExist) {
      throw new NotFoundException("Archivo no identificado");
    }

    // Generamos una URL prefirmada para conceder acceso al archivo
    const params = {
      Bucket: this.configService.get<string>('cloudflare_credentials.bucket'),
      Key: archivoExist.clave
    }
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 120
    });

    return url;

  }

  update(id: number) {
    return `This action updates a #${id} archivo`;
  }

  remove(id: number) {
    return `This action removes a #${id} archivo`;
  }

}
