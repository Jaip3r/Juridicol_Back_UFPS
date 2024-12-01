import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';


export function IsIdentificacionValida(validationOptions?: ValidationOptions) {

    return function (object: Object, propertyName: string) {

        registerDecorator({
            name: 'isIdentificacionValida', // Nombre del validador
            target: object.constructor, // Clase a la que se aplica el validador
            propertyName: propertyName, // Propiedad a la que se aplica el validador
            options: validationOptions, // Opciones del validador
            validator: { // Lógica del validador

                validate(value: any, args: ValidationArguments) {

                    // Obtenemos el valor de la propiedad a validar
                    const { tipo_identificacion } = args.object as any;

                    switch(tipo_identificacion) {
                        case 'Cédula de ciudadanía':
                            return typeof value === 'string' && /^\d+$/.test(value) 
                                    && value.length >= 8 && value.length <= 10
                        case 'Cédula de extranjería':
                            return typeof value === 'string' && /^\d+$/.test(value) 
                                    && value.length >= 6 && value.length <= 15
                        case 'Pasaporte':
                            return typeof value === 'string' && /^[A-Za-z0-9]+$/.test(value) 
                                    && value.trim().length >= 5 && value.trim().length <= 15
                        case 'Registro civil de nacimiento':
                            return typeof value === 'string' && /^\d+$/.test(value) 
                                    && value.length === 10
                        case 'Permiso especial de permanencia':
                            return typeof value === 'string' && /^[A-Za-z0-9]+$/.test(value) 
                                    && value.trim().length === 10
                        case 'VISA':
                            return typeof value === 'string' && /^[A-Za-z0-9]+$/.test(value) 
                                    && value.trim().length >= 8 && value.trim().length <= 15
                        case 'Libreta militar':
                            return typeof value === 'string' && /^\d+$/.test(value) 
                            && value.length >= 8 && value.length <= 10
                        default:
                            return true; // Otros tipos de identificación
                    }

                },
                defaultMessage(args: ValidationArguments) { // Define el mensaje de error por defecto

                    // Obtenemos el valor de la propiedad a validar
                    const { tipo_identificacion } = args.object as any;

                    return `Número de identificación inválido para el tipo de identificación ${tipo_identificacion}.`;

                }

            }

        });

    };

}