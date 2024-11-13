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
                    
                    // Validación para tipos que deben ser solo números y entre 8-15 dígitos
                    if (
                        ['Cédula de ciudadanía', 'Cédula de extranjería', 'Registro civil de nacimiento', 
                         'Permiso especial de permanencia', 'Libreta militar'].includes(tipo_identificacion)
                    ) {
                        return typeof value === 'string' &&
                               /^\d+$/.test(value) && // Solo dígitos
                               value.length >= 8 && value.length <= 15;
                    }
                    
                    // Validación para tipos que deben ser cadenas no vacías
                    if (['Pasaporte', 'VISA'].includes(tipo_identificacion)) {
                        return typeof value === 'string' && value.trim().length > 0;
                    }

                    // Otros tipos de identificación 
                    return true;

                },
                defaultMessage(args: ValidationArguments) { // Define el mensaje de error por defecto

                    // Obtenemos el valor de la propiedad a validar
                    const { tipo_identificacion } = args.object as any;

                    if (
                        ['Cédula de ciudadanía', 'Cédula de extranjería', 'Registro civil de nacimiento', 
                         'Permiso especial de permanencia', 'Libreta militar'].includes(tipo_identificacion)
                    ) {
                        return 'El número de identificación debe contener solo dígitos y tener entre 8 y 15 digitos.';
                    } else if (['Pasaporte', 'VISA'].includes(tipo_identificacion)) {
                        return 'El número de identificación es requerido y debe ser una cadena de caracteres.';
                    }
                    return 'Número de identificación inválido.';

                }

            }

        });

    };

}