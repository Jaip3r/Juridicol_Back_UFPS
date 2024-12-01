export interface SelectConsultaObject {

    id: boolean;
    radicado: boolean;
    tipo_consulta?: boolean;
    area_derecho: boolean;
    estado: boolean;
    nombre_accionante?: boolean;
    telefono_accionante?: boolean; 
    email_accionante?: boolean;
    direccion_accionante?: boolean;
    nombre_accionado?: boolean;
    telefono_accionado?: boolean; 
    email_accionado?: boolean;
    direccion_accionado?: boolean;
    fecha_registro: boolean;
    solicitante: {
        select: {
            tipo_solicitante: boolean,
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