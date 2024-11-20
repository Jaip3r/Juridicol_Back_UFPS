import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { TZDate } from '@date-fns/tz';
import { endOfDay, startOfDay } from 'date-fns';


@Injectable()
export class ConsultasService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly solicitanteService: SolicitantesService,
    private readonly archivosService: ArchivosService
  ) {}


  /*---- registerConsulta method ------*/

  async registerConsulta(data: CreateConsultaDto, userId: number, anexos: Array<Express.Multer.File>) {

    if (!anexos || (anexos && anexos.length === 0)) {
      throw new BadRequestException('Se debe adjuntar como mínimo el soporte de la recepción de la consulta');
    }

    if (data.tipo_consulta === TipoConsulta.asesoria_verbal && anexos.length > 1) {
      throw new BadRequestException('Solo se permiten la carga de 1 anexo para procesos de tipo asesoria');
    }

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

      await this.archivosService.uploadFiles(anexos, consulta.id);
      
    } catch (error) {

      throw new InternalServerErrorException(
        'La consulta se registró, pero ocurrió un error al subir los archivos. Por favor, intente subirlos nuevamente.'
      );
      
    }

    return consulta;

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
    const consultas = await this.getConsultasByfilterWithPrismaClient(filters, limite, order, pagination);

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
    limite: 'diaria' | 'global' = 'global',
    searchItem?: string
  ) {

    return searchItem !== undefined && searchItem !== ''
      ? 1
      : this.countConsultasWithPrismaClient(filters, limite);

  }


  /*---- getConsultasReport method ------*/

  getInfoConsultasReport(
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
    limite: 'diaria' | 'global' = 'global',
    order: 'asc' | 'desc' = 'desc'
  ) {

    // Obtenemos la fecha actual
    const fecha_actual = new TZDate(new Date(), 'America/Bogota');

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
    }
  ) {

    // Destructuramos los datos para manejar la paginación
    const { cursor, limit, direction } = pagination;

    // Obtenemos la fecha actual
    const fecha_actual = new TZDate(new Date(), 'America/Bogota');

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
    },
    limite: 'diaria' | 'global' = 'global'
  ) {

    // Obtenemos la fecha actual
    const fecha_actual = new TZDate(new Date(), 'America/Bogota');

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


  /*---- buildConsultaWherePrismaClientClause method ------*/

  private buildConsultaWherePrismaClientClause(
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
    start_today?: string,
    end_today?: string
  ) {

    // Aplicamos formato a los filtros 
    const formattedFilters = {
      area_derecho: filters.area_derecho,
      tipo_consulta: filters.tipo_consulta,
      estado: filters.estado,
      fecha_registro: {
        gte: start_today,
        lt: end_today
      },
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


}
