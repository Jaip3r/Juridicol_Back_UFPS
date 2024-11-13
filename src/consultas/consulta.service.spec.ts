import { PrismaService } from "../prisma/prisma.service";
import { ConsultasService } from "./consultas.service";
import { SolicitantesService } from "../solicitantes/solicitantes.service";
import { Test, TestingModule } from "@nestjs/testing";
import { CreateConsultaDto } from "./dto/create-consulta.dto";
import { Genero } from "../solicitantes/enum/genero";
import { TipoIdentificacion } from "../solicitantes/enum/tipoIdentificacion";
import { Discapacidad } from "../solicitantes/enum/discapacidad";
import { Vulnerabilidad } from "../solicitantes/enum/vulnerabilidad";
import { NivelEstudio } from "../solicitantes/enum/nivelEstudio";
import { Estrato } from "../solicitantes/enum/estrato";
import { Sisben } from "../solicitantes/enum/sisben";
import { NivelIngresoEconomico } from "../solicitantes/enum/nivelIngresoEconomico";
import { ActividadEconomica } from "../solicitantes/enum/actividadEconomica";
import { TipoConsulta } from "./enum/tipoConsulta";
import { AreaDerecho } from "../users/enum/areaDerecho.enum";

describe('Pruebas de concurrencia en ConsultaService', () => {

    let consultaService: ConsultasService;
    let prismaService: PrismaService;
    let solicitanteService: SolicitantesService;
    let userId: number;

    beforeAll(async () => {

        const module: TestingModule = await Test.createTestingModule({
            providers: [ConsultasService, PrismaService, SolicitantesService],
        }).compile();

        consultaService = module.get<ConsultasService>(ConsultasService);
        prismaService = module.get<PrismaService>(PrismaService);
        solicitanteService = module.get<SolicitantesService>(SolicitantesService);

    });

    userId = 1;

    afterAll(async () => {
        // Limpiar la base de datos después de las pruebas si es necesario
        await prismaService.consulta.deleteMany({});
        await prismaService.radicadoCounter.deleteMany({});
        await prismaService.$disconnect();
    });

    it('debe manejar concurrencia y generar radicados únicos', async () => {

        const data: CreateConsultaDto = {
    
            nombre: 'Juan',
            apellidos: 'Pérez',
            genero: Genero.MAS,
            tipo_identificacion: TipoIdentificacion.CC,
            numero_identificacion: '12345678',
            fecha_nacimiento: '1990-01-01',
            numero_contacto: '3001234567',
            discapacidad: Discapacidad.NONE,
            vulnerabilidad: Vulnerabilidad.NONE,
            email: 'juan.perez@example.com',
            lugar_nacimiento: 'Bogotá',
            ciudad: 'Bogotá',
            direccion_actual: 'Calle 123 #45-67',
            nivel_estudio: NivelEstudio.PROF,
            estrato: Estrato.ESTRATO_3,
            sisben: Sisben.NONE,
            nivel_ingreso_economico: NivelIngresoEconomico.SMMV_2_3,
            actividad_economica: ActividadEconomica.ACTIVIDADES_FINANCIERAS,
            oficio: 'Ingeniero',
            nombre_accionante: 'Pedro Gómez',
            telefono_accionante: '3107654321',
            correo_accionante: 'pedro.gomez@example.com',
            direccion_accionante: 'Carrera 45 #67-89',
            nombre_accionado: 'Empresa XYZ',
            telefono_accionado: '3151234567',
            correo_accionado: 'contacto@empresa.xyz',
            direccion_accionado: 'Avenida 123 #45-67',
            hechos: 'Descripción de los hechos relevantes.',
            pretensiones: 'Descripción de las pretensiones.',
            observaciones: 'Observaciones adicionales.',
            tipo_consulta: TipoConsulta.consulta,
            area_derecho: AreaDerecho.PE,
        };

        const numberOfConcurrentRequests = 10;
        const promises = [];

        for (let i = 0; i < numberOfConcurrentRequests; i++) {
            promises.push(
                consultaService.create({ ...data }, userId).catch((err) => err),
            );
        }

        const results = await Promise.all(promises);

        // Filtrar resultados exitosos y errores
        const successfulResults = results.filter((r) => !(r instanceof Error));
        const errors = results.filter((r) => r instanceof Error);

        // Verificar que no hubo errores
        expect(errors.length).toBe(0);

        // Verificar que todos los radicados son únicos
        const radicados = successfulResults.map((r) => r.radicado);
        const uniqueRadicados = new Set(radicados);

        expect(uniqueRadicados.size).toBe(numberOfConcurrentRequests);

        // Imprimir los radicados generados
        console.log('Radicados generados:', radicados);

    });

});
