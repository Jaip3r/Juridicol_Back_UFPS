import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

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

  findAllUsers() {

    // Obtenemos unicamente los usuarios que esten activos
    return this.prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [
          { rol: 'estudiante' },
          { rol: 'profesor' }
        ]
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        codigo: true,
        rol: true,
        area_derecho: true,
        grupo: true,
        fecha_registro: true
      }
    });

  }

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
        email: true,
        codigo: true,
        rol: true,
        area_derecho: true,
        grupo: true
      }
    });

    // En caso de no encontrar al usuario
    if (!userExists) throw new NotFoundException(`Usuario no identificado`);

    return userExists;

  }

  async findOneUserByEmail(email: string) {

    // Busca al usuario por el email proporcionado
    return this.prisma.usuario.findUnique({
      where: {
        email
      }
    });

  }

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

  async removeUser(id: number) {

    await this.findOneUser(id);

    return this.prisma.usuario.update({
      where: { id },
      data: {
        activo: false
      }
    })

  }

}
