import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
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
import { SelectConsultaObject } from './interface/select-consulta';
import { endOfDay, startOfDay } from 'date-fns';
import { Tipo_Solicitante } from 'src/solicitantes/enum/tipo_solicitante';
import { ActorUserInterface } from 'src/common/interfaces/actor-user.interface';


@Injectable()
export class ConsultasService {

  private readonly logger = new Logger(ArchivosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly solicitanteService: SolicitantesService,
    private readonly archivosService: ArchivosService
  ) {}


  /*---- registerConsulta method ------*/

  async registerConsulta(data: CreateConsultaDto, userId: number, anexos: Array<Express.Multer.File>) {

    // En caso de no proporcionar ningún anexo
    if (!anexos || (anexos && anexos.length === 0)) {
      throw new BadRequestException('Se debe adjuntar como mínimo el soporte de la recepción de la consulta');
    }

    // En caso de ser un proceso de asesoria verbal solo se admite la carga de 1 solo archivo
    if (data.tipo_consulta === TipoConsulta.asesoria_verbal && anexos.length > 1) {
      throw new BadRequestException('Solo se permiten la carga de 1 anexo para procesos de tipo asesoria');
    }

    // Verificamos que, en caso de haber discapacidad, su valor tenga coherencia con la vulnerabilidad
    if ((data.discapacidad !== Discapacidad.NONE && data.vulnerabilidad === Vulnerabilidad.NONE) || (data.vulnerabilidad === Vulnerabilidad.PDI && data.discapacidad === Discapacidad.NONE)) {
      throw new BadRequestException('Si el solicitante presenta una discapacidad, debe asociarla con la vulnerabilidad correspondiente');
    }

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
    const semestre = month <= 7 ? '1' : '2';
    const semestreString = `${year}${semestre}`;

    // Transacción para la creación la consulta
    const consulta = await this.prisma.$transaction(async (prisma) => {

      // Obtenemos o creamos el solicitante
      const solicitante = await this.solicitanteService.findOrCreateSolicitante(data, prisma);

      // Incrementamos el contador de manera atómica
      const radicadoCounter = await this.incrementRadicadoCounter(
        prisma,
        data.area_derecho,
        semestreString
      )

      // Obtenemos el número secuencial del radicado
      const sequentialNumber = radicadoCounter.contador;

      // Formateamos el número secuencial
      const formattedNumber = sequentialNumber.toString().padStart(3, '0');

      // Generamos el radicado
      const radicado = `CJ${areaCode}${formattedNumber}-${semestreString}`;

      // Creamos la consulta con los datos proporcionados
      const nuevaConsulta = await prisma.consulta.create({
        data: {
          radicado,
          tipo_consulta: data.tipo_consulta,
          area_derecho: data.area_derecho,
          estado: data.tipo_consulta === TipoConsulta.asesoria_verbal ? 'finalizada' : 'pendiente', 
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
          id_estudiante_registro: userId,
          ...(data.tipo_consulta === TipoConsulta.asesoria_verbal && {
            fecha_finalizacion: new Date()
          })
        }
      });

      return nuevaConsulta;

    });

    // Llevamos a cabo la carga de archivos
    try {

      await this.archivosService.uploadFiles(anexos, consulta.id, consulta.radicado);
      
    } catch (error) {

      this.logger.error({
        request: {},
        error: error.stack
      }, `Error durante la carga de archivos para la consulta ${consulta.radicado}: ${error.message}`);

      throw new InternalServerErrorException({
          message: 'Consulta registrada, pero ocurrió un error al subir los archivos. Por favor, intente subirlos nuevamente.',
          consultaId: consulta.id
      });
      
    }

    return consulta;

  }


  /*---- getConsultasByFilters method ------*/

  async getConsultasByFilters(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
      solicitante_id?: number;
    },
    limite: 'diaria' | 'global' = 'global',
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
    const consultas = searchItem !== undefined && searchItem !== '' 
      ? await this.getConsultasByFiltersWithQueryRaw(filters, limite, order, pagination, searchItem)
      : await this.getConsultasByfilterWithPrismaClient(filters, limite, order, pagination);

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
      tipo_solicitante?: Tipo_Solicitante
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
      solicitante_id?: number;
    },
    limite: 'diaria' | 'global' = 'global',
    searchItem?: string
  ) {

    return searchItem !== undefined && searchItem !== ''
      ? this.countConsultasWithQueryRaw(filters, limite, searchItem)
      : this.countConsultasWithPrismaClient(filters, limite);

  }


  /*---- getInfoConsultasReport method ------*/

  getInfoConsultasReport(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    limite: 'diaria' | 'global' = 'global',
    order: 'asc' | 'desc' = 'desc'
  ) {

    // Obtenemos la fecha actual
    const fecha_actual = new Date();

    // Calculamos el inicio y fin del dia 
    const start_today = startOfDay(fecha_actual).toISOString();
    const end_today = endOfDay(fecha_actual).toISOString();

    // Creamos el objeto where con los filtros proporcionados
    const where = limite === 'diaria'
      ? this.buildConsultaWherePrismaClientClause(filters, start_today, end_today)
      : this.buildConsultaWherePrismaClientClause(filters);

    // Construimos el objeto select basado en el estado de la consulta 
    const selectObject = this.buildSelectObject(filters.estado, true);

    // Devolvemos la info obtenida
    return this.prisma.consulta.findMany({
      where,
      select: selectObject,
      orderBy: [
        { id: order }
      ]
    });

  }


  /*---- getInfoConsulta method ------*/

  async getInfoConsulta(id: number) {

    // Obtenemos la info de la consulta en base a su identificador
    const consultaExists = await this.prisma.consulta.findUnique({
      where: {
        id
      },
      select: {
        radicado: true,
        tipo_consulta: true,
        area_derecho: true,
        estado: true,
        hechos: true,
        pretensiones: true,
        observaciones: true,
        nombre_accionante: true,
        telefono_accionante: true, 
        email_accionante: true,
        direccion_accionante: true,
        nombre_accionado: true,
        telefono_accionado: true, 
        email_accionado: true,
        direccion_accionado: true,
        fecha_registro: true,
        fecha_asignacion: true,
        fecha_finalizacion: true,
        solicitante: {
          select: {
            tipo_solicitante: true,
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
        },
        estudiante_asignado: {
          select: {
            nombres: true,
            apellidos: true,
            codigo: true
          }
        }
      }
    });

    // En caso de no encontrar al solicitante
    if (!consultaExists) throw new NotFoundException("Consulta no identificada");

    return consultaExists;

  }


  async retryFileUpload(consultaId: number, actorUser: ActorUserInterface, anexos: Array<Express.Multer.File>) {

    // Verificamos que la consulta existe
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      select: { radicado: true, id_estudiante_registro: true }
    });

    if (!consulta) {
      throw new NotFoundException('Consulta no identificada');
    }

    // Verificamos los permisos del usuario
    if (consulta.id_estudiante_registro !== actorUser.sub) {
      throw new ForbiddenException('No tiene permiso para modificar esta consulta');
    }

    // Realizamos la carga de los archivos
    try {
      await this.archivosService.uploadFiles(anexos, consultaId, consulta.radicado);
    } catch (error) {

      this.logger.error({
        request: {},
        error: error.stack
      }, `Error al reintentar cargar los archivos para la consulta ${consulta.radicado}: ${error.message}`);

      throw new InternalServerErrorException(
        'Ocurrió un error al subir los archivos. Por favor, intente nuevamente.'
      );

    }

  }


  // CASO PARA CAMBIO DE AREA

  update(id: number, updateConsultaDto: UpdateConsultaDto) {
    return `This action updates a #${id} consulta`;
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
            createError.code === 'P2002' 
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
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
      solicitante_id?: number;
    },
    limite: 'diaria' | 'global' = 'global',
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    // Obtenemos la fecha actual
    const fecha_actual = new Date();

    // Calculamos el inicio y fin del dia 
    const start_today = startOfDay(fecha_actual).toISOString();
    const end_today = endOfDay(fecha_actual).toISOString();

    // Creamos el objeto where de la consulta con los filtros proporcionados
    const where = limite === 'diaria' 
      ? this.buildConsultaWherePrismaClientClause(filters, start_today, end_today)
      : this.buildConsultaWherePrismaClientClause(filters);

    // Construimos el objeto select basado en el estado de la consulta 
    const selectObject = this.buildSelectObject(filters.estado);

    // Configuramos el cursor para la paginación
    const queryCursor = cursor
      ? { id: cursor.id }
      : undefined;

    // Obtenemos las consultas que cumplen con los parametros de filtro y usando paginación basada en cursor
    const flteredConsultas = await this.prisma.consulta.findMany({
      take: (direction === 'prev' ? -1 : 1) * (limit + 1),
      skip: cursor ? 1 : 0,
      cursor: queryCursor,
      select: selectObject,
      where,
      orderBy: [{ id: order }]
    });

    return flteredConsultas;

  }


  /*---- getConsultasByFilterWithQueryRaw method ------*/

  private async getConsultasByFiltersWithQueryRaw(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    limite: 'diaria' | 'global' = 'global',
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { id: number };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    searchItem?: string
  ) {

    // Obtenemos los datos del objeto de paginación
    const { cursor, limit, direction } = pagination;

    // Obtenemos la fecha actual
    const fecha_actual = new Date();

    // Calculamos el inicio y fin del dia 
    const start_today = startOfDay(fecha_actual).toISOString();
    const end_today = endOfDay(fecha_actual).toISOString();

    // Construimos el array de condiciones 
    const conditions = limite === 'diaria' 
      ? this.buildConsultaConditionsClauseQueryRaw(filters, searchItem, start_today, end_today)
      : this.buildConsultaConditionsClauseQueryRaw(filters, searchItem);
    
    // Ajustamos los operadores de comparación y el orden de los datos
    let operator: string;
    let adjustedOrder: 'asc' | 'desc';

    if (direction === 'next') {

      operator = order === 'asc' ? '>=' : '<=';
      adjustedOrder = order;

    } else if (direction === 'prev') {

      operator = order === 'asc' ? '<=' : '>=';
      adjustedOrder = order === 'asc' ? 'desc' : 'asc';

    } else {
      adjustedOrder = order;
    }

    // Condición para el manejo del cursor para la paginación
    if (cursor) {

      // Añadimos la condición que rige la paginación
      conditions.push(
        Prisma.sql`"Consulta"."id" ${Prisma.raw(operator)} (
          SELECT "id" 
          FROM "Consulta"
          WHERE "id" = ${cursor}
          LIMIT 1
        )`
      );

    }

    // Unimos todas las condiciones con 'AND'
    const whereClause = conditions.length
      ? Prisma.join(conditions, ' AND ')
      : undefined;
    
    // Configuramos el número de registros a obtener (take)
    const takeClause = limit + 1;

    // Configuramos el offset
    const offsetClause = cursor ? Prisma.sql`OFFSET 1` : Prisma.empty;

    // Construimos y ejecutamos la consulta
    const consultas = await this.prisma.$queryRaw<
      any[]
    >`
      SELECT 
        "Consulta"."id",
        "Consulta"."radicado",
        "Consulta"."area_derecho",
        "Consulta"."estado",
        "Consulta"."fecha_registro",
        "Consulta"."fecha_asignacion",
        "Consulta"."fecha_finalizacion",
        "Solicitante"."tipo_solicitante" AS "solicitante_tipo",
        "Solicitante"."nombre" AS "solicitante_nombre",
        "Solicitante"."apellidos" AS "solicitante_apellidos",
        "Solicitante"."tipo_identificacion" AS "solicitante_tipo_identificacion",
        "Solicitante"."numero_identificacion" AS "solicitante_numero_identificacion",
        "Estudiante_Registro"."nombres" AS "estudiante_registro_nombres",
        "Estudiante_Registro"."apellidos" AS "estudiante_registro_apellidos",
        "Estudiante_Registro"."codigo" AS "estudiante_registro_codigo",
        "Estudiante_Asignacion"."nombres" AS "estudiante_asignado_nombres",
        "Estudiante_Asignacion"."apellidos" AS "estudiante_asignado_apellidos",
        "Estudiante_Asignacion"."codigo" AS "estudiante_asignado_codigo"
      FROM "Consulta"
      INNER JOIN "Solicitante" 
        ON "Consulta"."id_solicitante" = "Solicitante"."id"
      LEFT JOIN "PerfilSocioEconomico"
        ON "Solicitante"."id" = "PerfilSocioEconomico"."id_solicitante"
      LEFT JOIN "Usuario" AS "Estudiante_Registro"
        ON "Consulta"."id_estudiante_registro" = "Estudiante_Registro"."id"
      LEFT JOIN "Usuario" AS "Estudiante_Asignacion"
        ON "Consulta"."id_estudiante_asignado" = "Estudiante_Asignacion"."id"
      WHERE ${whereClause}
      ORDER BY "Consulta"."id" ${Prisma.raw(adjustedOrder.toUpperCase())}
      LIMIT ${takeClause}
      ${offsetClause}
    `;

    // En caso de paginar hacia atrás
    if (direction === 'prev') {
      consultas.reverse();
    }

    return consultas;

  }


  /*---- countConsultasByFilterWithPrismaClient method ------*/

  private countConsultasWithPrismaClient(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
      solicitante_id?: number;
    },
    limite: 'diaria' | 'global' = 'global'
  ) {

    // Obtenemos la fecha actual
    const fecha_actual = new Date();

    // Calculamos el inicio y fin del dia 
    const start_today = startOfDay(fecha_actual).toISOString();
    const end_today = endOfDay(fecha_actual).toISOString();

    // Creamos el objeto where con los filtros proporcionados
    const where = limite === 'global' 
      ? this.buildConsultaWherePrismaClientClause(filters)
      : this.buildConsultaWherePrismaClientClause(filters, start_today, end_today);

    // Obtenemos el total de registros que coinciden con los filtros
    return this.prisma.consulta.count({
      where
    });

  }


  /*---- countConsultasWithQueryRaw method ------*/

  private async countConsultasWithQueryRaw(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    limite: 'diaria' | 'global' = 'global',
    searchItem?: string
  ) {

    // Obtenemos la fecha actual
    const fecha_actual = new Date();

    // Calculamos el inicio y fin del dia 
    const start_today = startOfDay(fecha_actual).toISOString();
    const end_today = endOfDay(fecha_actual).toISOString();

    // Creamos el objeto where con los filtros proporcionados
    const conditions = limite === 'global' 
      ? this.buildConsultaConditionsClauseQueryRaw(filters, searchItem)
      : this.buildConsultaConditionsClauseQueryRaw(filters, searchItem, start_today, end_today);

    // Unimos todas las condiciones con 'AND'
    const whereClause = conditions.length
      ? Prisma.join(conditions, ' AND ')
      : undefined;

    // Calculamos el total de registros a obtener
    const toltalRecordsResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(1) as count
      FROM "Consulta"
      INNER JOIN "Solicitante" 
        ON "Consulta"."id_solicitante" = "Solicitante"."id"
      LEFT JOIN "PerfilSocioEconomico"
        ON "Solicitante"."id" = "PerfilSocioEconomico"."id_solicitante"
      WHERE ${whereClause}
    `;
    const totalRecords = Number(toltalRecordsResult[0]?.count || 0);

    return totalRecords;

  }


  /*---- buildConsultaWherePrismaClientClause method ------*/

  private buildConsultaWherePrismaClientClause(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
      solicitante_id?: number;
    },
    start_today?: string,
    end_today?: string
  ) {

    // Aplicamos formato a los filtros 
    const formattedFilters = {
      area_derecho: filters.area_derecho,
      tipo_consulta: filters.tipo_consulta,
      estado: filters.estado,
      id_solicitante: filters.solicitante_id,
      fecha_registro: {
        gte: start_today,
        lt: end_today
      },
      solicitante: {
        tipo_solicitante: filters.tipo_solicitante,
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


  /*---- buildSelectObject method ------*/

  private buildSelectObject (estado: EstadoConsulta, informe?: boolean): SelectConsultaObject { 

    let selectObject: SelectConsultaObject = { 
      id: true, 
      radicado: true, 
      area_derecho: true, 
      estado: true, 
      fecha_registro: true, 
      solicitante: { 
        select: { 
          tipo_solicitante: true, 
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
    }; 
    
    // En caso que el estado de la consulta sea asignada o finalizada
    if (estado === 'asignada' || estado === 'finalizada') { 
      selectObject.fecha_asignacion = true; 
      selectObject.estudiante_asignado = { 
        select: { 
          nombres: true, 
          apellidos: true, 
          codigo: true 
        } 
      }; 
    } 
    
    // En caso que el estado de la consulta sea finalizada
    if (estado === 'finalizada') { 
      selectObject.fecha_finalizacion = true; 
    }
    
    // Caso para la generación del reporte
    if (informe) {
      selectObject.tipo_consulta = true;
      selectObject.nombre_accionante = true;
      selectObject.telefono_accionante = true; 
      selectObject.email_accionante = true;
      selectObject.direccion_accionante = true;
      selectObject.nombre_accionado = true;
      selectObject.telefono_accionado = true; 
      selectObject.email_accionado = true;
      selectObject.direccion_accionado = true;
    }
    
    return selectObject; 
  
  };


  /*---- buildConsultaConditionsClauseQueryRaw method ------*/
  private buildConsultaConditionsClauseQueryRaw(
    filters: {
      area_derecho?: AreaDerecho;
      tipo_consulta?: TipoConsulta;
      estado?: EstadoConsulta;
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    searchItem: string,
    start_today?: string,
    end_today?: string
  ) {

    // Construimos el array de condiciones 
    const conditions: Prisma.Sql[] = [];

    // Agregamos la condición de búsqueda por texto
    const searchQuery = searchItem + ':*';
    conditions.push(Prisma.sql`to_tsvector('spanish', radicado) @@ to_tsquery('spanish', ${searchQuery})`);

    // Añadimos los filtros adicionales si se da el caso
    if (filters.area_derecho) {
      conditions.push(
        Prisma.sql`"Consulta"."area_derecho"::text = ${filters.area_derecho}`
      );
    }

    if (filters.tipo_consulta) {
      conditions.push(
        Prisma.sql`"Consulta"."tipo_consulta"::text = ${filters.tipo_consulta}`
      );
    }

    if (filters.estado) {
      conditions.push(
        Prisma.sql`"Consulta"."estado"::text = ${filters.estado}`
      );
    }

    if (start_today && end_today) {
      conditions.push(
         Prisma.sql`"Consulta"."fecha_registro" >= ${start_today}::timestamp without time zone`,
         Prisma.sql`"Consulta"."fecha_registro" < ${end_today}::timestamp without time zone`
      );  
    }

    // Filtros de la tabla Solicitante
    if (filters.tipo_solicitante) {
      conditions.push(
        Prisma.sql`"Solicitante"."tipo_solicitante" = ${filters.tipo_solicitante}`
      );
    }

    if (filters.discapacidad) {
      conditions.push(
        Prisma.sql`"Solicitante"."discapacidad" = ${filters.discapacidad}`
      );
    }

    if (filters.vulnerabilidad) {
      conditions.push(
        Prisma.sql`"Solicitante"."vulnerabilidad" = ${filters.vulnerabilidad}`
      );
    }

    // Filtros de la tabla PerfilSocioeconomico
    if (filters.nivel_estudio) {
      conditions.push(Prisma.sql`"PerfilSocioEconomico"."nivel_estudio" = ${filters.nivel_estudio}`);
    }

    if (filters.sisben) {
      conditions.push(Prisma.sql`"PerfilSocioEconomico"."sisben" = ${filters.sisben}`);
    }

    if (filters.estrato) {
      conditions.push(Prisma.sql`"PerfilSocioEconomico"."estrato" = ${filters.estrato}`);
    }

    return conditions;

  }


}
