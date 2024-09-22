import { Prisma } from "@prisma/client";
import * as bcrypt from 'bcrypt';

// Añade una query extension que modifica la operación de create en el módulo de usuario,
// permitiendo hashear la contraseña del usuario una vez se crea
export default Prisma.defineExtension((client) => {

    return client.$extends({

        query: {

            usuario: {

                async create({ args, query }) {

                    const password = args.data.password;
                    if (password) {
                        const saltRounds = await bcrypt.genSalt(12);
                        args.data.password = await bcrypt.hash(password, saltRounds);
                    }
                    return query(args);

                },
                async update({ args, query }) {

                    console.log('intercepted update query');
                    if (args.data.password) {
                        const newPassword = args.data.password.toString();
                        const saltRounds = await bcrypt.genSalt(12);
                        args.data.password = await bcrypt.hash(newPassword, saltRounds);
                    }
                    return query(args);

                }

            }

        }

    })

});