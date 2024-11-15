export interface SelectConsultaObject {

    id: boolean;
    radicado: boolean;
    area_derecho: boolean;
    estado: boolean;
    fecha_registro: boolean;
    solicitante: {
        select: {
            nombre: boolean;
            apellidos: boolean;
            tipo_identificacion: boolean;
            numero_identificacion: boolean;
        };
    };
    estudiante_registro: {
        select: {
            nombres: boolean;
            apellidos: boolean;
            codigo: boolean;
        };
    };
    fecha_asignacion?: boolean;
    estudiante_asignado?: {
        select: {
            nombres: boolean;
            apellidos: boolean;
            codigo: boolean;
        };
    };
    fecha_finalizacion?: boolean;

}