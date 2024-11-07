import { Injectable } from '@nestjs/common';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';
import { Prisma } from '@prisma/client';
import { AreaDerecho } from '../users/enum/areaDerecho.enum';

@Injectable()
export class ConsultasService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly solicitanteService: SolicitantesService
  ) {}


  /*---- createConsulta method ------*/

  async create(data: CreateConsultaDto, userId: number) {
    
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
      return prisma.consulta.create({
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
      })

    })

  }

  findAll() {
    return `This action returns all consultas`;
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


}
