
# Juridicol Back UFPS

## Descripción

Este proyecto es una parte integral del sistema de gestión de consultas Juridicol UFPS. Desarrollado con el framework [NestJS](https://nestjs.com), se beneficia de su eficiencia, escalabilidad y facilidad de mantenimiento. Además, utiliza [Prisma ORM](https://www.prisma.io) para simplificar la interacción con las bases de datos.

## Requisitos previos

Antes de empezar, asegúrate de tener instalados los siguientes programas:

- **[Node.js](https://nodejs.org)** (versión recomendada: `18.x` o superior)
- **[npm](https://www.npmjs.com/)**
- **Base de datos:** PostgreSQL, asegúrate de crear o tener acceso a la base de datos configurada en `DATABASE_URL`.

## Instalación

Clona este repositorio e instala las dependencias:

```bash
$ git clone https://github.com/Jaip3r/Juridicol_Back_UFPS.git
$ cd Juridicol_Back_UFPS
$ npm install
```

## Estructura del proyecto

```bash
src/
├── archivos/               # Módulo para la gestión de archivos
├── auth/                   # Módulo para la gestión de autenticación
├── consultas/              # Módulo para la gestión de consultas
├── mail/                   # Módulo para la gestión de correos
├── solicitantes/           # Módulo para la gestión de solicitantes
├── storage/                # Módulo para la gestión de almacenamiento
├── users/                  # Módulo para la gestión de usuarios
├── config/                 # Módulo de configuración
├── common/                 # Código para uso compartido (filtros, interceptores, etc.)
├── prisma/                 # Archivos relacionados con Prisma (configuración del cliente, extensiones, etc.)
├── app.module.ts           # Módulo raíz
├── main.ts                 # Punto de entrada principal
```

## Configuración del entorno

El proyecto usa `dotenv-cli` para el manejo de múltiples archivos `.env` según el entorno:

- `.env.development`: Variables para entorno de desarrollo.
- `.env.test`: Variables para entorno de pruebas.
- `.env`: Variables por defecto (para el entorno de producción).

Asegúrate de configurar correctamente estos archivos antes de ejecutar el proyecto para el entono especifico. Ejemplo de estructura de `.env.development`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
ACCESS_TOKEN_SECRET="tu_access_token_secret"
REFRESH_TOKEN_SECRET="tu_refresh_token_secret"
SENDGRID_API_KEY="tusendgridapikey"
SENDGRID_SENDER_EMAIL="tuemail@example.com"
SENDGRID_SENDER_NAME="TuNombre"
CLOUDFLARE_ACCESS_KEY="tucloudflareaccesskey"
CLOUDFLARE_SECRET_ACCESS_KEY="tucloudflaresecret"
CLOUDFLARE_ENDPOINT="https://tu-cloudflare-endpoint"
CLOUDFLARE_BUCKET_NAME="nombre-del-bucket"
PAGE_SIZE="5"
``` 

## Ejecución del proyecto

### Prisma ORM

* Aplica o crea migraciones para la base de datos

    ```bash
    # Crear una nueva migración basada en cambios en el esquema
    $ npm run migrate:dev --nombreMigracion

    # Resetea la base de datos y aplica migraciones
    $ npm run migrate:reset
    ``` 

* Sincroniza el esquema sin migraciones:

    ```bash
    $ npm run db:push
    ``` 

* Opcional: Poblar la base de datos con datos semilla (si existe prisma/seed.ts):

    ```bash
    $ npm run db:seed
    ``` 

* Abrir Prisma Studio (una herramienta GUI para manejar la base de datos)::

    ```bash
    $ npm run prisma:studio
    ``` 

### Desarrollo

Inicia el servidor en modo desarrollo con el siguiente comando:

```bash
$ npm run start:dev
``` 
Esto cargará las variables desde .env.development y habilitará la recarga automática del código.

**Nota:** Si es la primera vez que ejecutas el proyecto, priemero debes ejecutar uno de los 2 comandos especificados para aplicar migraciones (migrate:dev o db:push) para inicializar el esquema de base de datos.

### Pruebas

```bash
# Ejecutar todas las pruebas unitarias
$ npm run test

# Modo interactivo para pruebas
$ npm run test:watch

# Pruebas de cobertura
$ npm run test:cov

# Pruebas de extremo a extremo
$ npm run test:e2e
``` 

Las pruebas cargan variables desde el archivo .env.test.

### Producción

Para construir y ejecutar el proyecto en producción:

```bash
# Genera el cliente prisma, aplica las migraciones y construye la versión final del aplicativo
$ npm run production:build

# Inicia el servidor
$ npm run start:prod
``` 

**Nota:** Aqui es donde entra el entorno Docker
