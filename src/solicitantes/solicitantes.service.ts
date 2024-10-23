import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSolicitanteDto } from './dto/update-solicitante.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSolicitanteDto } from './dto/create-solicitante.dto';
import { TipoIdentificacion } from './enum/tipoIdentificacion';
import { Discapacidad } from './enum/discapacidad';
import { Vulnerabilidad } from './enum/vulnerabilidad';
import { NivelEstudio } from './enum/nivelEstudio';
import { Sisben } from './enum/sisben';
import { Estrato } from './enum/estrato';
import { Prisma } from '@prisma/client';

@Injectable()
export class SolicitantesService {

  constructor(private readonly prisma: PrismaService) {}

  /*---- createSolicitante method ------*/

  async createSolicitante(data: CreateSolicitanteDto) {

    // Verificamos la unicidad del documento de identidad
    const documentExists = await this.prisma.solicitante.findUnique({
      where: {
        numero_identificacion: data.numero_identificacion,
      },
    });

    if (documentExists) throw new BadRequestException(`El número de documento ya se encuentra registrado`);

    // Verificamos que no mas de 2 usuarios tengan el mismo correo (si es que se proporciona)
    if (data.email) {

      const sharedMail = await this.prisma.solicitante.count({
        where: {
          email: data.email,
        },
      });

      if (sharedMail >= 2) {
        throw new BadRequestException(
          'Ya hay demasiadas personas compartiendo el mismo correo',
        );
      }

    }

    // Registramos el solicitante a partir de la data recibida
    return this.prisma.solicitante.create({
      data: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        tipo_identificacion: data.tipo_identificacion,
        numero_identificacion: data.numero_identificacion,
        genero: data.genero,
        fecha_nacimiento: new Date(data.fecha_nacimiento),
        lugar_nacimiento: data.lugar_nacimiento,
        discapacidad: data.discapacidad,
        vulnerabilidad: data.vulnerabilidad,
        direccion_actual: data.direccion_actual,
        email: data.email,
        numero_contacto: data.numero_contacto,
        perfilSocioeconomico: {
          create: {
            nivel_estudio: data.nivel_estudio,
            estrato: data.estrato,
            sisben: data.sisben,
            oficio: data.oficio,
            nivel_ingreso_economico: data.nivel_ingreso_economico,
            departamento: data.departamento,
            ciudad: data.ciudad,
            barrio: data.barrio,
          }
        }
      }
    });

  }


  /*---- findAllSolicitante method ------*/

  async findAllSolicitantes(
    filters: {
      tipo_identificacion?: TipoIdentificacion;
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
    const { totalRecords, solicitantes } = searchItem !== undefined && searchItem !== '' 
      ? await this.findAllSolicitantesWithQueryRaw(filters, order, pagination, searchItem)
      : await this.findAllSolicitantesWithPrismaClient(filters, order, pagination);

    // Si no hay registros, devolvemos vacío
    if (solicitantes.length === 0) {
      return {
        solicitantes: [],
        nextCursor: null,
        prevCursor: null,
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
      prevCursor,
      totalRecords,
    };

  }


  /*---- getInfoSolicitantesReport method ------*/

  getInfoSolicitantesReport(
    filters: {
      tipo_identificacion?: TipoIdentificacion;
      discapacidad?: Discapacidad;
      vulnerabilidad?: Vulnerabilidad;
      nivel_estudio?: NivelEstudio;
      sisben?: Sisben;
      estrato?: Estrato;
    }
  ) {

    // Creamos el objeto where con los filtros proporcionados
    const where = {
      ...(filters.tipo_identificacion && { tipo_identificacion: filters.tipo_identificacion }),
      ...(filters.discapacidad && { discapacidad: filters.discapacidad }),
      ...(filters.vulnerabilidad && { vulnerabilidad: filters.vulnerabilidad }),
      ...((filters.nivel_estudio || filters.sisben || filters.estrato) && {
        perfilSocioeconomico: {
          ...(filters.nivel_estudio && { nivel_estudio: filters.nivel_estudio }),
          ...(filters.sisben && { sisben: filters.sisben }),
          ...(filters.estrato && { estrato: filters.estrato })
        }
      })
    };

    // Devolvemos la info obtenida
    return this.prisma.solicitante.findMany({
      where,
      select: {
        nombre: true,
        apellidos: true,
        tipo_identificacion: true,
        numero_identificacion: true,
        genero: true,
        fecha_nacimiento: true,
        lugar_nacimiento: true,
        discapacidad: true,
        vulnerabilidad: true,
        direccion_actual: true,
        email: true,
        numero_contacto: true,
        perfilSocioeconomico: {
          select: {
            nivel_estudio: true,
            estrato: true,
            sisben: true,
            oficio: true,
            nivel_ingreso_economico: true,
            departamento: true,
            ciudad: true,
            barrio: true
          }
        }
      }
    });

  }


  /*---- findOneSolicitante method ------*/

  async findOneSolicitante(id: number) {

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
        genero: true,
        fecha_nacimiento: true,
        lugar_nacimiento: true,
        discapacidad: true,
        vulnerabilidad: true,
        direccion_actual: true,
        email: true,
        numero_contacto: true,
        perfilSocioeconomico: {
          select: {
            nivel_estudio: true,
            estrato: true,
            sisben: true,
            oficio: true,
            nivel_ingreso_economico: true,
            departamento: true,
            ciudad: true,
            barrio: true
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
    const solicitanteExists = await this.findOneSolicitante(id);

    // Verificamos la unicidad del numero de identificación si se esta actualizando
    if (
      data.numero_identificacion &&
      data.numero_identificacion !== solicitanteExists.numero_identificacion
    ) {

      const documentExists = await this.prisma.solicitante.findUnique({
        where: { numero_identificacion: data.numero_identificacion },
      });

      if (documentExists) {
        throw new BadRequestException(
          `El número de documento ya se encuentra registrado.`,
        );
      }

    }

    // Verificamos la cantidad de solicitantes que ya usan el mismo correo, si se proporciona
    if (data.email && data.email !== solicitanteExists.email) {

      const emailCount = await this.prisma.solicitante.count({
        where: {
          email: data.email,
        },
      });

      if (emailCount >= 2)
        throw new BadRequestException(
          'Ya hay demasiadas personas compartiendo el mismo correo.',
        );

    }

    // Preparar los datos para actualizar el perfil socioeconómico
    const perfilSocioeconomicoData: Prisma.PerfilSocioEconomicoUpdateInput = {};
    if (data.nivel_estudio) perfilSocioeconomicoData.nivel_estudio = data.nivel_estudio;
    if (data.estrato) perfilSocioeconomicoData.estrato = data.estrato;
    if (data.sisben) perfilSocioeconomicoData.sisben = data.sisben;
    if (data.oficio) perfilSocioeconomicoData.oficio = data.oficio;
    if (data.nivel_ingreso_economico) perfilSocioeconomicoData.nivel_ingreso_economico = data.nivel_ingreso_economico;
    if (data.departamento) perfilSocioeconomicoData.departamento = data.departamento;
    if (data.ciudad) perfilSocioeconomicoData.ciudad = data.ciudad;
    if (data.barrio) perfilSocioeconomicoData.barrio = data.barrio;

    // Actualizamos al solicitante junto con su perfil socioeconómico
    return this.prisma.solicitante.update({
      where: { id },
      data: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        tipo_identificacion: data.tipo_identificacion,
        numero_identificacion: data.numero_identificacion,
        genero: data.genero,
        fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
        lugar_nacimiento: data.lugar_nacimiento,
        discapacidad: data.discapacidad,
        vulnerabilidad: data.vulnerabilidad,
        direccion_actual: data.direccion_actual,
        email: data.email,
        numero_contacto: data.numero_contacto,
        perfilSocioeconomico: {
          update: perfilSocioeconomicoData
        }
      }
    });

  }


  /*---- findAllSolicitantesWithPrismaClient method ------*/

  private async findAllSolicitantesWithPrismaClient(
    filters: {
      tipo_identificacion?: TipoIdentificacion;
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

    // Construimos el objeto de filtrado dinámicamente
    const where = {
      ...(filters.tipo_identificacion && { tipo_identificacion: filters.tipo_identificacion }),
      ...(filters.discapacidad && { discapacidad: filters.discapacidad }),
      ...(filters.vulnerabilidad && { vulnerabilidad: filters.vulnerabilidad }),
      ...((filters.nivel_estudio || filters.sisben || filters.estrato) && {
        perfilSocioeconomico: {
          ...(filters.nivel_estudio && { nivel_estudio: filters.nivel_estudio }),
          ...(filters.sisben && { sisben: filters.sisben }),
          ...(filters.estrato && { estrato: filters.estrato })
        }
      })
    };

    // Obtenemos el total de registros que coinciden con los filtros
    const totalRecords = await this.prisma.solicitante.count({
      where,
    });

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
      orderBy: [{ fecha_registro: order }],
    });

    return { totalRecords, solicitantes };

  }


  /*---- findAllSolicitantesWithQueryRaw method ------*/

  private async findAllSolicitantesWithQueryRaw(
    filters: {
      tipo_identificacion?: TipoIdentificacion;
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
    const conditions: Prisma.Sql[] = [];

    // Agregamos la condición de búsqueda por texto
    const searchQuery = searchItem.replace(' ', ' & ') + ':*';
    conditions.push(Prisma.sql`to_tsvector('spanish', lower("nombre") || ' ' || lower("apellidos")) @@ to_tsquery('spanish', ${searchQuery})`);

    // Añadimos los filtros adicionales si se da el caso
    if (filters.tipo_identificacion) {
      conditions.push(
        Prisma.sql`"Solicitante"."tipo_identificacion" = ${filters.tipo_identificacion}`
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
      : Prisma.sql`TRUE`;

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

    // Calculamos el total de registros a obtener
    const toltalRecordsResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Solicitante"
      INNER JOIN "PerfilSocioEconomico"
        ON "Solicitante"."id" = "PerfilSocioEconomico"."id_solicitante"
      WHERE ${whereClause}
    `;
    const totalRecords = Number(toltalRecordsResult[0]?.count || 0);
    
    return {
      totalRecords,
      solicitantes
    };

  }

}
