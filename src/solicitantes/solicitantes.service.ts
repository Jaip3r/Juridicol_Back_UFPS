import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSolicitanteDto } from './dto/update-solicitante.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSolicitanteDto } from './dto/create-solicitante.dto';
import { Discapacidad } from './enum/discapacidad';
import { Vulnerabilidad } from './enum/vulnerabilidad';
import { NivelEstudio } from './enum/nivelEstudio';
import { Sisben } from './enum/sisben';
import { Estrato } from './enum/estrato';
import { Prisma } from '@prisma/client';
import { buildWherePrismaClientClause } from '../common/utils/buildPrismaClientWhereClause';
import { Tipo_Solicitante } from './enum/tipo_solicitante';


@Injectable()
export class SolicitantesService {

  constructor(private readonly prisma: PrismaService) {}


  /*---- findOrCreateSolicitante method ------*/

  async findOrCreateSolicitante(
    data: CreateSolicitanteDto,
    prisma?: Prisma.TransactionClient,
  ) {

    const db = prisma || this.prisma;

    // Intentamos ubicar al solicitante por su número de identificación
    let solicitante = await db.solicitante.findUnique({
      where: { numero_identificacion: data.numero_identificacion },
    });

    // Verificación del correo (si se proporciona)
    if ((solicitante && data.email && data.email !== solicitante.email) || (!solicitante && data.email)) {

      const emailCount = await db.solicitante.count({
        where: { email: data.email },
      });

      if (emailCount >= 2) {
        throw new BadRequestException(
          'Ya hay demasiadas personas compartiendo el mismo correo',
        );
      }

    }

    // Datos para la creación o actualización del perfilsocioeconómico
    const perfilSocioeconomicoData = this.construirDatosPerfilSocioeconomico(data);

    // Datos para la creación o actualización del solicitante
    const solicitanteData = this.construirDatosSolicitante(data);

    // Si el solicitante ya existe, actualizamos su información 
    if (solicitante) {

      solicitante = await db.solicitante.update({
        where: { id: solicitante.id },
        data: {
          ...solicitanteData,
          perfilSocioeconomico: {
            update: perfilSocioeconomicoData
          }
        }
      });

    } else {

      // Caso contrario, registramos al nuevo solicitante
      solicitante = await  db.solicitante.create({
        data: {
          ...solicitanteData,
          perfilSocioeconomico: {
            create: perfilSocioeconomicoData
          }
        }
      });

    }

    return solicitante;

  }


  /*---- createSolicitante method ------*/

  async createSolicitante(data: CreateSolicitanteDto) {

    // Verificamos la unicidad del documento de identidad
    const documentExists = await this.prisma.solicitante.findUnique({
      where: {
        numero_identificacion: data.numero_identificacion
      }
    });

    if (documentExists) throw new BadRequestException(`El número de documento ya se encuentra registrado`);

    // Verificamos que no mas de 2 usuarios tengan el mismo correo (si es que se proporciona)
    if (data.email) {

      const sharedMail = await this.prisma.solicitante.count({
        where: {
          email: data.email
        }
      });

      if (sharedMail >= 2) {
        throw new BadRequestException(
          'Ya hay demasiadas personas compartiendo el mismo correo'
        );
      }

    }

    // Verificamos que, en caso de haber discapacidad, su valor tenga coherencia con la vulnerabilidad
    if ((data.discapacidad !== Discapacidad.NONE && data.vulnerabilidad === Vulnerabilidad.NONE) || (data.vulnerabilidad === Vulnerabilidad.PDI && data.discapacidad === Discapacidad.NONE)) {
      throw new BadRequestException('Si el solicitante presenta una discapacidad, debe asociarla con la vulnerabilidad correspondiente');
    }

    // Datos para la creación del registro
    const solicitanteData = this.construirDatosSolicitante(data);
    const perfilSocioeconomicoData = this.construirDatosPerfilSocioeconomico(data);

    // Registramos el solicitante a partir de la data recibida
    return this.prisma.solicitante.create({
      data: {
        ...solicitanteData,
        perfilSocioeconomico: {
          create: perfilSocioeconomicoData
        }
      }
    });

  }


  /*---- getSolicitantesByFilters method ------*/

  async getSolicitantesByFilters(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { fecha_registro: Date };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    searchItem?: string
  ) {

    // Obtenemos el limite y dirección del objeto de paginación
    const { limit, direction } = pagination;

    // Consultamos los solicitantes en base a al valor de los parametros
    const solicitantes = searchItem !== undefined && searchItem !== ''
      ? await this.getSolicitantesWithQueryRaw(filters, order, pagination, searchItem)
      : await this.getSolicitantesWithPrismaClient(filters, order, pagination);

    // Si no hay registros, devolvemos vacío
    if (solicitantes.length === 0) {
      return {
        solicitantes: [],
        nextCursor: null,
        prevCursor: null
      };
    }

    // Dependiendo de la dirección de paginación, usamos el elemento extra consultado
    const definedSolicitantes =
      direction === 'prev'
        ? solicitantes.slice(-limit)
        : solicitantes.slice(0, limit);

    // Verificación de si hay más elementos por paginar
    const hasMore = solicitantes.length > limit;

    // Determinamos los valores de nuestros nuevos cursores
    let nextCursor =
      direction === 'prev' || hasMore
        ? definedSolicitantes.at(-1).fecha_registro
        : undefined;

    let prevCursor =
      direction === 'next' || (direction === 'prev' && hasMore)
        ? definedSolicitantes.at(0).fecha_registro
        : undefined;

    return {
      solicitantes: definedSolicitantes,
      nextCursor,
      prevCursor
    };

  }


  /*---- countSolicitantesWithFilters method ------*/

  countSolicitantesWithFilters(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    searchItem?: string
  ) {

    return searchItem !== undefined && searchItem !== ''
      ? this.countSolicitantesWithQueryRaw(filters, searchItem)
      : this.countSolicitantesWithPrismaClient(filters);

  }


  /*---- getInfoSolicitantesReport method ------*/

  getInfoSolicitantesReport(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    }
  ) {

    // Creamos el objeto where con los filtros proporcionados
    const where = this.buildSolicitanteWherePrismaClientClause(filters);

    // Devolvemos la info obtenida
    return this.prisma.solicitante.findMany({
      where,
      select: {
        nombre: true,
        apellidos: true,
        tipo_identificacion: true,
        numero_identificacion: true,
        tipo_solicitante: true,
        genero: true,
        fecha_nacimiento: true,
        lugar_nacimiento: true,
        discapacidad: true,
        vulnerabilidad: true,
        ciudad: true,
        direccion_actual: true,
        email: true,
        numero_contacto: true,
        fecha_registro: true,
        perfilSocioeconomico: {
          select: {
            nivel_estudio: true,
            estrato: true,
            sisben: true,
            actividad_economica: true,
            oficio: true,
            nivel_ingreso_economico: true
          }
        }
      },
      orderBy: [ { fecha_registro: 'desc' } ]
    });

  }


  /*---- getOneSolicitante method ------*/

  async getOneSolicitante(id: number) {

    // Obtenemos la info del solicitante en base a su identificador
    const solicitanteExists = await this.prisma.solicitante.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        tipo_identificacion: true,
        numero_identificacion: true,
        tipo_solicitante: true,
        genero: true,
        fecha_nacimiento: true,
        lugar_nacimiento: true,
        discapacidad: true,
        vulnerabilidad: true,
        ciudad: true,
        direccion_actual: true,
        email: true,
        numero_contacto: true,
        perfilSocioeconomico: {
          select: {
            nivel_estudio: true,
            estrato: true,
            sisben: true,
            actividad_economica: true,
            oficio: true,
            nivel_ingreso_economico: true
          }
        }
      }
    });

    // En caso de no encontrar al solicitante
    if (!solicitanteExists) throw new NotFoundException("Solicitante no identificado");

    return solicitanteExists;

  }


  /*---- updateSolicitante method ------*/

  async updateSolicitante(id: number, data: UpdateSolicitanteDto) {

    // Verificamos la identidad del solicitante
    const solicitanteExists = await this.getOneSolicitante(id);

    // Verificamos la unicidad del numero de identificación si se esta actualizando
    if (
      data.numero_identificacion &&
      data.numero_identificacion !== solicitanteExists.numero_identificacion
    ) {

      const documentExists = await this.prisma.solicitante.findUnique({
        where: { numero_identificacion: data.numero_identificacion }
      });

      if (documentExists) {
        throw new BadRequestException(
          `El número de documento ya se encuentra registrado.`
        );
      }

    }

    // Verificamos la cantidad de solicitantes que ya usan el mismo correo, si se proporciona
    if (data.email && data.email !== solicitanteExists.email) {

      const emailCount = await this.prisma.solicitante.count({
        where: {
          email: data.email
        }
      });

      if (emailCount >= 2)
        throw new BadRequestException(
          'Ya hay demasiadas personas compartiendo el mismo correo.'
        );

    }

    // Verificamos que, en caso de haber discapacidad, su valor tenga coherencia con la vulnerabilidad
    if ((data.discapacidad !== Discapacidad.NONE && data.vulnerabilidad === Vulnerabilidad.NONE) || (data.vulnerabilidad === Vulnerabilidad.PDI && data.discapacidad === Discapacidad.NONE)) {
      throw new BadRequestException('Si el solicitante presenta una discapacidad, debe asociarla con la vulnerabilidad correspondiente');
    }

    // Preparar los datos para actualizar el perfil socioeconómico
    const solicitanteData = this.construirDatosSolicitante(data);
    const perfilSocioeconomicoData: Prisma.PerfilSocioEconomicoUpdateInput = this.construirDatosPerfilSocioeconomico(data);

    // Actualizamos al solicitante junto con su perfil socioeconómico
    return this.prisma.solicitante.update({
      where: { id },
      data: {
        ...solicitanteData,
        perfilSocioeconomico: {
          update: perfilSocioeconomicoData
        }
      }
    });

  }


  /*---- getSolicitantesWithPrismaClient method ------*/

  private async getSolicitantesWithPrismaClient(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { fecha_registro: Date };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    // Creamos el objeto where con los filtros proporcionados
    const where = this.buildSolicitanteWherePrismaClientClause(filters);

    // Configuramos el cursor para la paginación
    const queryCursor = cursor
      ? { fecha_registro: cursor.fecha_registro }
      : undefined;

    // Obtenemos los solicitantes en base a los parametros de filtro y usando paginación basada en cursor
    const solicitantes = await this.prisma.solicitante.findMany({
      take: (direction === 'prev' ? -1 : 1) * (limit + 1),
      skip: cursor ? 1 : 0,
      cursor: queryCursor,
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        numero_contacto: true,
        tipo_identificacion: true,
        numero_identificacion: true,
        tipo_solicitante: true,
        discapacidad: true,
        vulnerabilidad: true,
        fecha_registro: true,
        fecha_actualizacion: true,
        perfilSocioeconomico: {
          select: {
            nivel_estudio: true,
            sisben: true,
            estrato: true,
          },
        },
      },
      where,
      orderBy: [{ fecha_registro: order }]
    });

    return solicitantes;

  }


  /*---- getSolicitantesWithQueryRaw method ------*/

  private async getSolicitantesWithQueryRaw(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    order: 'asc' | 'desc' = 'desc',
    pagination: {
      cursor?: { fecha_registro: Date };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    searchItem?: string
  ) {

    // Obtenemos los datos del objeto de paginación
    const { cursor, limit, direction } = pagination;

    // Construimos el array de condiciones 
    const conditions = this.buildSolicitanteConditionsQueryRawClause(filters, searchItem);

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

      // Formateamos el cursor para su correcto procesamiento por PostgreSQL
      const fechaRegistroStr = cursor.fecha_registro.toISOString();

      // Añadimos la condición que rige la paginación
      conditions.push(
        Prisma.sql`"Solicitante"."fecha_registro" ${Prisma.raw(operator)} (
          SELECT "fecha_registro" 
          FROM "Solicitante"
          WHERE "fecha_registro" = ${fechaRegistroStr}::timestamp without time zone
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
    const solicitantes = await this.prisma.$queryRaw<
      any[]
    >`
      SELECT 
        "Solicitante"."id",
        "Solicitante"."nombre",
        "Solicitante"."apellidos",
        "Solicitante"."email",
        "Solicitante"."numero_contacto",
        "Solicitante"."tipo_identificacion",
        "Solicitante"."numero_identificacion",
        "Solicitante"."tipo_solicitante",
        "Solicitante"."discapacidad",
        "Solicitante"."vulnerabilidad",
        "Solicitante"."fecha_registro",
        "Solicitante"."fecha_actualizacion",
        "PerfilSocioEconomico"."nivel_estudio",
        "PerfilSocioEconomico"."sisben",
        "PerfilSocioEconomico"."estrato"
      FROM "Solicitante"
      INNER JOIN "PerfilSocioEconomico"
        ON "Solicitante"."id" = "PerfilSocioEconomico"."id_solicitante"
      WHERE ${whereClause}
      ORDER BY "Solicitante"."fecha_registro" ${Prisma.raw(adjustedOrder.toUpperCase())}
      LIMIT ${takeClause}
      ${offsetClause}
    `;

    // En caso de paginar hacia atrás
    if (direction === 'prev') {
      solicitantes.reverse();
    }

    return solicitantes

  }


  /*---- countSolicitantesWithPrismaClient method ------*/

  private async countSolicitantesWithPrismaClient(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    }
  ) {

    // Creamos el objeto where con los filtros proporcionados
    const where = this.buildSolicitanteWherePrismaClientClause(filters);

    // Obtenemos el total de registros que coinciden con los filtros
    const totalRecords = await this.prisma.solicitante.count({
      where
    });

    return totalRecords;

  }


  /*---- countSolicitantesWithQueryRaw method ------*/

  private async countSolicitantesWithQueryRaw(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    searchItem?: string
  ) {

    const conditions = this.buildSolicitanteConditionsQueryRawClause(filters, searchItem);

    // Unimos todas las condiciones con 'AND'
    const whereClause = conditions.length
      ? Prisma.join(conditions, ' AND ')
      : undefined;

    // Calculamos el total de registros a obtener
    const toltalRecordsResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(1) as count
      FROM "Solicitante"
      INNER JOIN "PerfilSocioEconomico"
        ON "Solicitante"."id" = "PerfilSocioEconomico"."id_solicitante"
      WHERE ${whereClause}
    `;
    const totalRecords = Number(toltalRecordsResult[0]?.count || 0);

    return totalRecords;

  }


  // Util Methods


  /*---- construirDatosSolicitante method ------*/

  private construirDatosSolicitante(data: CreateSolicitanteDto | UpdateSolicitanteDto) {

    return {
      nombre: data.nombre,
      apellidos: data.apellidos,
      tipo_identificacion: data.tipo_identificacion,
      numero_identificacion: data.numero_identificacion,
      tipo_solicitante: data.tipo_solicitante,
      genero: data.genero,
      fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
      lugar_nacimiento: data.lugar_nacimiento,
      discapacidad: data.discapacidad,
      vulnerabilidad: data.vulnerabilidad,
      ciudad: data.ciudad,
      direccion_actual: data.direccion_actual,
      email: data.email ?? null,
      numero_contacto: data.numero_contacto,
    };

  }


  /*---- construirDatosPerfilSocioeconomico method ------*/

  private construirDatosPerfilSocioeconomico(data: CreateSolicitanteDto | UpdateSolicitanteDto) {
    return {
      nivel_estudio: data.nivel_estudio,
      sisben: data.sisben,
      estrato: data.estrato,
      nivel_ingreso_economico: data.nivel_ingreso_economico,
      actividad_economica: data.actividad_economica,
      oficio: data.oficio,
    };
  }


  /*---- buildSolicitanteWherePrismaClientClause method ------*/

  private buildSolicitanteWherePrismaClientClause(filters: {
    tipo_solicitante?: Tipo_Solicitante;
    discapacidad?: Discapacidad;
    vulnerabilidad?: Vulnerabilidad;
    nivel_estudio?: NivelEstudio;
    sisben?: Sisben;
    estrato?: Estrato;
  }) {

    // Aplicamos formato a los filtros 
    const formattedFilters = {
      tipo_solicitante: filters.tipo_solicitante,
      discapacidad: filters.discapacidad,
      vulnerabilidad: filters.vulnerabilidad,
      perfilSocioeconomico: {
        nivel_estudio: filters.nivel_estudio,
        sisben: filters.sisben,
        estrato: filters.estrato
      }
    }

    // Construimos el objeto de filtrado dinámicamente
    return buildWherePrismaClientClause(formattedFilters);

  }


  /*---- buildSolicitanteConditionsQueryRawClause method ------*/

  private buildSolicitanteConditionsQueryRawClause(
    filters: {
      tipo_solicitante?: Tipo_Solicitante;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    },
    searchItem?: string
  ) {

    // Construimos el array de condiciones 
    const conditions: Prisma.Sql[] = [];

    // Agregamos la condición de búsqueda por texto
    const searchQuery = searchItem.replace(' ', ' & ') + ':*';
    conditions.push(Prisma.sql`to_tsvector('spanish', lower("nombre") || ' ' || lower("apellidos")) @@ to_tsquery('spanish', ${searchQuery})`);

    // Añadimos los filtros adicionales si se da el caso
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
