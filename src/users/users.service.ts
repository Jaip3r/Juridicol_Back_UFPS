import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Rol } from './enum/rol.enum';
import { AreaDerecho } from './enum/areaDerecho.enum';
import { Grupo } from './enum/grupo.enum';
import { UserDto } from './dto/user.dto';
import { buildWherePrismaClientClause } from 'src/common/utils/buildPrismaClientWhereClause';


@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  /*---- createUser method ------*/

  async createUser(data: Prisma.UsuarioCreateInput) {

    // Verificamos la unicidad del código y el correo
    const existUser = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { email: data.email },
          { codigo: data.codigo }
        ]
      }
    });

    if (existUser) {
      throw new BadRequestException(`El email o el códgo ya se encuentran registrados`);
    }

    // Si el usuario a registrar es profesor, verificamos que no hayan mas de 2 por area y que el código corresponda a 5 dititos
    if (data.rol === 'profesor') {

      if (data.codigo.length !== 5) {
        throw new BadRequestException("El código no corresponde al rol especificado");
      }

      const profesoresEnArea = await this.prisma.usuario.count({
        where: {
          rol: 'profesor',
          activo: true,
          area_derecho: data.area_derecho,
          grupo: data.grupo
        }
      });

      if (profesoresEnArea >= 1) {
        throw new BadRequestException(
          `Ya existe un profesor activo en el grupo ${data.grupo} para el área de ${data.area_derecho}`
        );
      }

    }

    // Si el usuario a registrar es estudiante, establecemos su posibilidad de recepción
    if (data.rol === 'estudiante') {

      data.puedeRecepionar = true

      if (data.codigo.length !== 7) {
        throw new BadRequestException("El código no corresponde al rol especificado");
      }

    }

    // Creamos el usuario a partir de la data recibida
    return this.prisma.extendedUserClient.usuario.create({
      data: {
        ...data
      }
    });

  }


  /*---- findAllUsers method ------*/

  async findAllUsers(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    order: 'asc' | 'desc' = 'asc',
    pagination: {
      cursor?: { fecha_registro: Date };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    },
    searchItem?: string
  ) {

    // Destructuramos los datos para manejar la paginación
    const { limit, direction } = pagination;

    // Consultamos los usuarios en base a al valor de los parametros
    const users = searchItem !== undefined && searchItem !== ''
      ? await this.findAllUsersWithQueryRaw(filters, order, pagination, searchItem)
      : await this.findAllUsersWithPrismaClient(filters, order, pagination);

    // Si no hay resultados, devolvemos vacío
    if (users.length === 0) {
      return {
        users: [],
        nextCursor: null,
        prevCursor: null,
      };
    }

    // Dependiendo de la dirección de paginación extraemos el elemento extra consultado
    const newUsers =
      direction === 'prev'
        ? users.slice(-limit)
        : users.slice(0, limit);

    // Verificación de si hay mas datos por paginar
    const hasMore = users.length > limit;

    // Determinamos el valor del cursor para paginar hacia adelante (si aplica)
    let nextCursor =
      direction === 'prev' || hasMore
        ? new Date(newUsers.at(-1).fecha_registro)
        : undefined;

    // Determinamo el valor del cursor para paginar hacia atrás (si aplica)
    let prevCursor =
      direction === 'next' || (direction === 'prev' && hasMore)
        ? new Date(newUsers.at(0).fecha_registro)
        : undefined;

    return {
      users: newUsers,
      nextCursor,
      prevCursor
    };

  }


  /*---- countAllUsersWithFilters method ------*/

  countAllUsersWithFilters(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    searchItem?: string
  ) {

    return searchItem !== undefined && searchItem !== ''
      ? this.countAllUsersWithQueryRaw(filters, searchItem)
      : this.countAllUsersWithPrismaClient(filters);

  }


  /*---- getInfoSolicitantesReport method ------*/

  getInfoUsersReport(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    }
  ) {

    // Creamos el objeto where con los filtros proporcionados
    const where = buildWherePrismaClientClause(filters);

    // Devolvemos la info obtenida
    return this.prisma.usuario.findMany({
      where,
      select: {
        nombres: true,
        apellidos: true,
        celular: true,
        email: true,
        codigo: true,
        rol: true,
        area_derecho: true,
        grupo: true,
        fecha_registro: true,
        activo: true
      }
    });

  }


  /*---- findOneUser method ------*/

  async findOneUser(id: number) {

    // Buscamos al usuario por su identificador
    const userExists = await this.prisma.usuario.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        celular: true,
        email: true,
        codigo: true,
        rol: true,
        area_derecho: true,
        grupo: true,
        fecha_registro: true
      }
    });

    // En caso de no encontrar al usuario
    if (!userExists) throw new NotFoundException(`Usuario no identificado`);

    return userExists;

  }


  /*---- findOneUserByEmail method ------*/

  async findOneUserByEmail(email: string) {

    // Busca al usuario por el email proporcionado
    return this.prisma.usuario.findUnique({
      where: {
        email
      }
    });

  }


  /*---- updateUser method ------*/

  async updateUser(id: number, data: Prisma.UsuarioUpdateInput) {

    const userExists = await this.findOneUser(id);

    // Obtenemos los valores actuales de email y código, manejando los tipos posibles
    const newEmail = typeof data.email === 'string' ? data.email : data.email?.set;
    const newCodigo = typeof data.codigo === 'string' ? data.codigo : data.codigo?.set;
    const newGrupo = typeof data.grupo === 'string' ? data.grupo : data.grupo?.set;
    const newAreaDerecho = typeof data.area_derecho === 'string' ? data.area_derecho : data.area_derecho?.set;

    // Verificar que en caso de cambiar el rol o el area no tenga consultas asignadas 
    // (si las tiene debe proporcionar un anexo de cambio de area antes de proceder)

    // Verificamos la longitud del código en base al rol del usuario
    if (newCodigo) {

      if (data.rol === 'estudiante' && newCodigo.length !== 7) {
        throw new BadRequestException("El código no corresponde al rol especificado");
      }

      if (data.rol === 'profesor' && newCodigo.length !== 5) {
        throw new BadRequestException("El código no corresponde al rol especificado");
      }

    }

    // En caso de recibir un recibir un nuevo correo o código, y que estos difieran a los originales
    if (
      (newEmail || newCodigo) &&
      (newCodigo !== userExists.codigo || newEmail !== userExists.email)
    ) {

      // Busca si hay otro usuario con el mismo código o correo electrónico
      const existUserData = await this.prisma.usuario.findFirst({
        where: {
          OR: [
            { email: newEmail },
            { codigo: newCodigo }
          ]
        }
      });

      if (existUserData) {

        if (existUserData.email === newEmail) {
          throw new BadRequestException('El correo electrónico ya está en uso por otro usuario.');
        }

        if (existUserData.codigo === newCodigo) {
          throw new BadRequestException('El código ya está en uso por otro usuario.');
        }

      }

    }

    // Si el rol es profesor, verificamos la cantidad de profesores en el grupo y área
    if (
      (data.rol === 'profesor' && data.rol !== userExists.rol)
      || (userExists.rol === 'profesor' && (data.area_derecho !== userExists.area_derecho || data.grupo !== userExists.grupo))
    ) {

      const profesoresGrupoYArea = await this.prisma.usuario.count({
        where: {
          id: { not: id }, // Excluimos el usuario actual
          rol: Rol.PROFESOR,
          activo: true,
          area_derecho: newAreaDerecho,
          grupo: newGrupo
        }
      });

      if (profesoresGrupoYArea >= 1) {
        throw new BadRequestException(
          `Ya existe un profesor activo en el grupo ${newGrupo} para el área de ${newAreaDerecho}`
        );
      }

    }

    // Realizamos la actualización del usuario con los datos proporcionados
    return this.prisma.usuario.update({
      where: { id },
      data,
    });

  }


  /*---- updatePassword method ------*/

  updatePassword(id: number, newPassword: string) {

    // Actualizamos la contraseña del usuario
    return this.prisma.extendedUserClient.usuario.update({
      where: { id },
      data: {
        password: newPassword
      }
    });

  }


  /*---- disableUser method ------*/

  async disableUser(id: number) {

    await this.findOneUser(id);

    // Deshabilitamos el acceso al sistema del usuario
    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: false
      }
    })

  }


  /*---- enableUsers method ------*/

  async enableUser(id: number) {

    await this.findOneUser(id);

    // Habilitamos el acceso al sistema al usuario
    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: true
      }
    })

  }


  /*---- countAllUsersWithPrismaClient method ------*/

  async countAllUsersWithPrismaClient(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    }
  ) {

    // Construimos el objeto de filtrado dinámicamente
    const where = buildWherePrismaClientClause(filters);

    // Obtenemos el total de registros que coinciden con los filtros
    const totalRecords = await this.prisma.usuario.count({
      where,
    });

    return totalRecords;

  }


  /*---- countAllUsersWithQueryRaw method ------*/

  async countAllUsersWithQueryRaw(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    searchItem?: string
  ) {

    // Construimos el array de condiciones 
    const conditions = this.buildUserConditionsClauseQueryRaw(filters, searchItem);

    // Unimos todas las condiciones con 'AND'
    const whereClause = conditions.length
      ? Prisma.join(conditions, ' AND ')
      : Prisma.sql`TRUE`;

    // Calculamos el total de registros a obtener
    const toltalRecordsResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Usuario"
      WHERE ${whereClause}
    `;
    const totalRecords = Number(toltalRecordsResult[0]?.count || 0);

    return totalRecords;

  }


  /*---- countUsersByRol method ------*/

  countUsersGroupByRol() {

    // Retornamos el conteo de usuarios registrados por rol
    return this.prisma.usuario.groupBy({

      by: ["rol"],
      _count: {
        _all: true
      }

    });

  }


  /*---- findAllUsersWithPrismaClient method ------*/

  private async findAllUsersWithPrismaClient(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    order: 'asc' | 'desc' = 'asc',
    pagination: {
      cursor?: { fecha_registro: Date };
      limit: number;
      direction: 'next' | 'prev' | 'none';
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    const where = buildWherePrismaClientClause(filters);

    // Configurar el cursor para la paginación
    const queryCursor = cursor ? { fecha_registro: cursor.fecha_registro } : undefined;

    // Obtenemos los usuarios basandono en los parametros de filtro y con paginación basada en cursor
    const users = await this.prisma.usuario.findMany({
      take: (direction === 'prev' ? -1 : 1) * (limit + 1),
      skip: cursor ? 1 : 0,
      cursor: queryCursor,
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        celular: true,
        email: true,
        codigo: true,
        rol: true,
        area_derecho: true,
        grupo: true,
        fecha_registro: true,
        activo: true
      },
      where,
      orderBy: [
        { fecha_registro: order }
      ]
    });

    return users;

  }


  /*---- findAllUsersWithQueryRaw method ------*/

  private async findAllUsersWithQueryRaw(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    order: 'asc' | 'desc' = 'asc',
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
    const conditions = this.buildUserConditionsClauseQueryRaw(filters, searchItem);

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
        Prisma.sql`"Usuario"."fecha_registro" ${Prisma.raw(operator)} (
          SELECT "fecha_registro" 
          FROM "Usuario"
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
    const users = await this.prisma.$queryRaw<
      UserDto[]
    >`
      SELECT 
        "Usuario"."id",
        "Usuario"."nombres",
        "Usuario"."apellidos",
        "Usuario"."celular",
        "Usuario"."email",
        "Usuario"."codigo",
        "Usuario"."rol",
        "Usuario"."area_derecho",
        "Usuario"."grupo",
        "Usuario"."fecha_registro",
        "Usuario"."activo"
      FROM "Usuario"
      WHERE ${whereClause}
      ORDER BY "Usuario"."fecha_registro" ${Prisma.raw(adjustedOrder.toUpperCase())}
      LIMIT ${takeClause}
      ${offsetClause}
    `;

    // En caso de paginar hacia atrás
    if (direction === 'prev') {
      users.reverse();
    }

    return users;

  }


  // Util Methods

  private buildUserConditionsClauseQueryRaw(
    filters: {
      rol?: Rol;
      area_derecho?: AreaDerecho;
      grupo?: Grupo;
      activo?: boolean;
    },
    searchItem?: string
  ) {

    // Construimos el array de condiciones 
    const conditions: Prisma.Sql[] = [];

    // Agregamos la condición de búsqueda por texto
    const searchQuery = searchItem + ':*';
    conditions.push(Prisma.sql`to_tsvector('spanish', codigo) @@ to_tsquery('spanish', ${searchQuery})`);

    // Añadimos los filtros adicionales si se da el caso
    if (filters.rol) {
      conditions.push(
        Prisma.sql`"Usuario"."rol"::text = ${filters.rol}`
      );
    }

    if (filters.area_derecho) {
      conditions.push(
        Prisma.sql`"Usuario"."area_derecho"::text = ${filters.area_derecho}`
      );
    }

    if (filters.grupo) {
      conditions.push(
        Prisma.sql`"Usuario"."grupo"::text = ${filters.grupo}`
      );
    }

    if (filters.activo) {
      conditions.push(
        Prisma.sql`"Usuario"."activo" = ${filters.activo}`
      );
    }

    return conditions;

  }

}
