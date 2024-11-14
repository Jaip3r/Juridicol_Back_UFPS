import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';
import { Prisma } from '@prisma/client';
import { AreaDerecho } from '../users/enum/areaDerecho.enum';
import { ArchivosService } from '../archivos/archivos.service';
import { TipoConsulta } from './enum/tipoConsulta';
import { Discapacidad } from '../solicitantes/enum/discapacidad';
import { Vulnerabilidad } from '../solicitantes/enum/vulnerabilidad';
import { NivelEstudio } from '../solicitantes/enum/nivelEstudio';
import { Sisben } from '../solicitantes/enum/sisben';
import { Estrato } from '../solicitantes/enum/estrato';
import { EstadoConsulta } from './enum/estadoConsulta';
import { buildWherePrismaClientClause } from '../common/utils/buildPrismaClientWhereClause';
import { TipoAnexo } from 'src/archivos/enum/tipoAnexo';


@Injectable()
export class ConsultasService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly solicitanteService: SolicitantesService,
    private readonly archivosService: ArchivosService
  ) {}


  /*---- registerConsulta method ------*/

  async registerConsulta(data: CreateConsultaDto, userId: number, anexos: Array<Express.Multer.File>) {

    if (data.tipo_consulta !== TipoConsulta.consulta && anexos && anexos.length > 0) {
      throw new BadRequestException('Solo se permiten anexos para procesos de tipo consulta');
    }
    
    return this.prisma.$transaction(async (prisma) => {

      // Obtenemos o creamos el solicitante
      const solicitante = await this.solicitanteService.findOrCreateSolicitante(data, prisma);

      // Mapeamos el área de derecho al código correspondiente
      const areaCodeMap = {
        penal: 'PE',
        laboral: 'L',
        publico: 'PB',
        civil: 'RC',
      };
      const areaCode = areaCodeMap[data.area_derecho];

      // Obtenemos el año actual y el semestre
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const semestre = month <= 6 ? '01' : '02';
      const semestreString = `${year}-${semestre}`;

      // Incrementamos el contador de manera atómica
      const radicadoCounter = await this.incrementRadicadoCounter(
        prisma,
        data.area_derecho,
        semestreString
      )

      // Generamos el radicado
      const sequentialNumber = radicadoCounter.contador;
      const radicado = `CJ${areaCode}${sequentialNumber}${semestreString}`;

      // Creamos la consulta con los datos proporcionados
      const consulta = await prisma.consulta.create({
        data: {
          radicado,
          tipo_consulta: data.tipo_consulta,
          area_derecho: data.area_derecho,
          hechos: data.hechos,
          pretensiones: data.pretensiones,
          observaciones: data.observaciones,
          nombre_accionante: data.nombre_accionante,
          telefono_accionante: data.telefono_accionante,
          email_accionante: data.correo_accionante,
          direccion_accionante: data.direccion_accionante,
          nombre_accionado: data.nombre_accionado,
          telefono_accionado: data.telefono_accionado,
          email_accionado: data.correo_accionado,
          direccion_accionado: data.direccion_accionado,
          id_solicitante: solicitante.id,
          id_estudiante_registro: userId
        }
      });

      await this.archivosService.uploadFilesInMemory(anexos, consulta.id, prisma);

      return consulta;

    })

  }


  /*---- getConsultasByFilters method ------*/

  async getConsultasByFilters(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    searchItem?: string
  ) {

    // Obtenemos el limite y dirección del objeto de paginación
    const { limit, direction } = pagination;

    // Consultamos los solicitantes en base a al valor de los parametros
    const consultas = await this.getConsultasByfilterWithPrismaClient(filters, order, pagination);

    // Si no hay registros, devolvemos vacío
    if (consultas.length === 0) {
      return {
        consultas: [],
        nextCursor: null,
        prevCursor: null
      };
    }

    // Dependiendo de la dirección de paginación, usamos el elemento extra consultado
    const definedConsultas =
      direction === 'prev'
        ? consultas.slice(-limit)
        : consultas.slice(0, limit);

    // Verificación de si hay más elementos por paginar
    const hasMore = consultas.length > limit;

    // Determinamos los valores de nuestros nuevos cursores
    let nextCursor =
      direction === 'prev' || hasMore
        ? definedConsultas.at(-1).id
        : undefined;

    let prevCursor =
      direction === 'next' || (direction === 'prev' && hasMore)
        ? definedConsultas.at(0).id
        : undefined;

    return {
      consultas: definedConsultas,
      nextCursor,
      prevCursor
    };

  }


  /*---- countConsultasByFilters method ------*/

  countConsultasByFilters(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    searchItem?: string
  ) {

    return searchItem !== undefined && searchItem !== ''
      ? 1
      : this.countConsultasWithPrismaClient(filters);

  }


  /*---- getArchivosConsulta method ------*/

  async getArchivosConsulta(
    tipo_anexo: TipoAnexo,
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    id_consulta: number
  ) {

    // Verificamos la existencia de la consulta
    const consultaExist = await this.prisma.consulta.findUnique({
      where: {
        id: id_consulta
      }
    });

    if (!consultaExist) {
      throw new NotFoundException("Consulta no identificada");;
    }

    // Devolvemos los arhcivos asociados a dicha consulta
    return this.archivosService.getArcvhivosByConsulta(tipo_anexo, order, pagination, id_consulta);

    
  }


  findOne(id: number) {
    return `This action returns a #${id} consulta`;
  }

  update(id: number, updateConsultaDto: UpdateConsultaDto) {
    return `This action updates a #${id} consulta`;
  }

  remove(id: number) {
    return `This action removes a #${id} consulta`;
  }


  // Util Methods


  /*---- incrementarRadicadoCounter method ------*/

  private async incrementRadicadoCounter(
    prisma: Prisma.TransactionClient,
    area_derecho: AreaDerecho,
    semestre: string
  ) {

    try {

      // Intentamos actualizar el contador si el registro ya existe
      const radicadoCounter = await prisma.radicadoCounter.update({
        where: {
          area_semestre_unique: {
            area_derecho,
            semestre
          }
        },
        data: {
          contador: {
            increment: 1
          }
        }
      });

      return radicadoCounter;
      
    } catch (error) {

      if (error.code === 'P2025') {

        // Si el registro no existe, intentamos crearlo
        try {

          const radicadoCounter = await prisma.radicadoCounter.create({
            data: {
              area_derecho,
              semestre,
              contador: 1,
            },
          });

          return radicadoCounter;

        } catch (createError) {

          if (
            createError.code === 'P2002' &&
            createError.meta.target.includes('area_semestre_unique')
          ) {

            // En caso de que otro proceso haya creado el registro, reintentamos la actualización
            const radicadoCounter = await prisma.radicadoCounter.update({
              where: {
                area_semestre_unique: {
                  area_derecho,
                  semestre,
                },
              },
              data: {
                contador: {
                  increment: 1,
                },
              },
            });

            return radicadoCounter;

          } else {
            throw createError; // Otros errores al crear
          }

        }

      } else {
        throw error; // Otros errores al actualizar
      }
      
    }

  }


  /*---- getConsultasByFilterWithPrismaClient method ------*/

  private async getConsultasByfilterWithPrismaClient(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    // Creamos el objeto where de la consulta con los filtros proporcionados
    const where = this.buildConsultaWherePrismaClientClause(filters);

    // Configuramos el cursor para la paginación
    const queryCursor = cursor
      ? { id: cursor.id }
      : undefined;

    // Obtenemos las consultas que cumplen con los parametros de filtro y usando paginación basada en cursor
    const flteredConsultas = await this.prisma.consulta.findMany({
      take: (direction === 'prev' ? -1 : 1) * (limit + 1),
      skip: cursor ? 1 : 0,
      cursor: queryCursor,
      select: {
        id: true,
        radicado: true,
        area_derecho: true,
        estado: true,
        fecha_registro: true,
        solicitante: {
          select: {
            nombre: true,
            apellidos: true,
            tipo_identificacion: true,
            numero_identificacion: true
          }
        },
        estudiante_registro: {
          select: {
            nombres: true,
            apellidos: true,
            codigo: true
          }
        }
      },
      where,
      orderBy: [{ id: order }]
    });

    return flteredConsultas;

  }


  /*---- getConsultasByFilterWithPrismaClient method ------*/

  private countConsultasWithPrismaClient(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    }
  ) {

    // Creamos el objeto where con los filtros proporcionados
    const where = this.buildConsultaWherePrismaClientClause(filters);

    // Obtenemos el total de registros que coinciden con los filtros
    return this.prisma.consulta.count({
      where
    });

  }


  /*---- buildConsultaWherePrismaClientClause method ------*/

  private buildConsultaWherePrismaClientClause(filters: {
    area_derecho?: AreaDerecho;
    tipo_consulta?: TipoConsulta;
    estado?: EstadoConsulta;
    discapacidad?: Discapacidad;
    vulnerabilidad?: Vulnerabilidad;
    nivel_estudio?: NivelEstudio;
    sisben?: Sisben;
    estrato?: Estrato;
  }) {

    // Aplicamos formato a los filtros 
    const formattedFilters = {
      area_derecho: filters.area_derecho,
      tipo_consulta: filters.tipo_consulta,
      estado: filters.estado,
      solicitante: {
        discapacidad: filters.discapacidad,
        vulnerabilidad: filters.vulnerabilidad,
        perfilSocioeconomico: {
          nivel_estudio: filters.nivel_estudio,
          sisben: filters.sisben,
          estrato: filters.estrato
        }
      }
    }

    // Construimos el objeto de filtrado final, eliminando los elementos sin valor
    return buildWherePrismaClientClause(formattedFilters);

  }


}
