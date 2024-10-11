import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Rol } from './enum/rol.enum';
import { AreaDerecho } from './enum/areaDerecho.enum';
import { Grupo } from './enum/grupo.enum';


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

    // Si el usuario a registrar es profesor, verificamos que no hayan mas de 2 por area
    if (data.rol === 'profesor') {

      const profesoresEnArea = await this.prisma.usuario.count({
        where: {
          rol: 'profesor',
          activo: true,
          area_derecho: data.area_derecho
        }
      });

      if (profesoresEnArea >= 2) {
        throw new BadRequestException(
          `No se pueden registrar más de 2 profesores en el área de ${data.area_derecho}`
        );
      }

    }

    // Si el usuario a registrar es estudiante, establecemos su posibilidad de recepción
    if (data.rol === 'estudiante') {
      data.puedeRecepionar = true
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
      cursor?: { fecha_registro: Date; id: number };
      limit: number;
      direction: 'next' | 'prev';
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    // Vamos a construir el objeto de filtrado dinámicamente
    const where = {
      ...(filters.activo !== undefined && { activo: filters.activo }),
      rol: filters.rol || { in: [Rol.ESTUDIANTE, Rol.PROFESOR] },
      ...(filters.area_derecho && { area_derecho: filters.area_derecho }),
      ...(filters.grupo && { grupo: filters.grupo }),
    };

    // Obtenemos el total de registros que coinciden con los filtros
    const totalRecords = await this.prisma.usuario.count({
      where,
    });

    // Configurar el cursor compuesto para la paginación
    let queryCursor = undefined;
    if (cursor) {

      queryCursor = { 

        fecha_registro: cursor.fecha_registro,
        id: cursor.id,
        
      }

    }

    // Invertimos el orden si estamos paginando hacia atrás
    const adjustedOrder = direction === 'next' ? order : (order === 'asc' ? 'desc' : 'asc');

    // Obtenemos los usuarios basandono en los parametros de filtro y con paginación basada en cursor
    const users = await this.prisma.usuario.findMany({
      where,
      take: limit + 1,
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
      orderBy: [
        { fecha_registro: adjustedOrder },
        { id: adjustedOrder }
      ]
    });

    // Si no hay resultados, devolvemos vacío
    if (users.length === 0) {
      return {
        users: [],
        nextCursor: null,
        prevCursor: null,
      };
    }

    // Si estamos paginando hacia atrás, invertir los resultados
    if (direction === 'prev') {
      users.reverse();
    }

    let nextCursor = undefined;
    let prevCursor = undefined;

    // Si el número de usuarios recuperados es mayor que el limite, indica que hay más páginas disponibles
    if (users.length > limit) {

      if (direction === 'next') {

        const nextUser = users.pop(); // Remover el registro extra
        nextCursor = { // Se define el siguiente cursor con los datos del último usuario
          fecha_registro: nextUser.fecha_registro,
          id: nextUser.id,
        };

      } else {
       
        const prevUser = users[0] // Obtener el cursor previo del primer registro previo
        prevCursor = {
          fecha_registro: prevUser.fecha_registro,
          id: prevUser.id,
        };

      }

    }

    // Establecer el prevCursor para la siguiente solicitud
    if (direction === 'next' && cursor) {
      prevCursor = cursor;
    } else if (direction === 'prev' && users.length > 0) {
      nextCursor = {
        fecha_registro: users[users.length - 1].fecha_registro,
        id: users[users.length - 1].id,
      };
      users.pop(); // Remover el registro extra del final
    }

    return {
      users,
      nextCursor,
      prevCursor,
      totalRecords
    };

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

    // Verificar que en caso de cambiar el rol o el area no tenga consultas asignadas

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
            { codigo: newCodigo },
          ],
        },
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


  /*---- countUsers method ------*/

  countUsersByRol() {

    // Retornamos el conteo de usuarios registrados por rol
    return this.prisma.usuario.groupBy({
      
      by: ["rol"],
      _count: {
        _all: true
      }

    });

  }

}
