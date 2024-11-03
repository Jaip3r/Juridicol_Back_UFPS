/*
  Warnings:

  - The values [asignado,cerrado] on the enum `Estado` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `ruta` on the `Archivo` table. All the data in the column will be lost.
  - You are about to drop the `Consulta_involucrados` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Persona_involucrada` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `url` to the `Archivo` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tipo` on the `Archivo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `direccion_accionante` to the `Consulta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email_accionante` to the `Consulta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre_accionado` to the `Consulta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre_accionante` to the `Consulta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefono_accionante` to the `Consulta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Estado_new" AS ENUM ('pendiente', 'asignada', 'finalizada');
ALTER TABLE "Consulta" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Consulta" ALTER COLUMN "estado" TYPE "Estado_new" USING ("estado"::text::"Estado_new");
ALTER TYPE "Estado" RENAME TO "Estado_old";
ALTER TYPE "Estado_new" RENAME TO "Estado";
DROP TYPE "Estado_old";
ALTER TABLE "Consulta" ALTER COLUMN "estado" SET DEFAULT 'pendiente';
COMMIT;

-- DropForeignKey
ALTER TABLE "Consulta_involucrados" DROP CONSTRAINT "Consulta_involucrados_id_consulta_fkey";

-- DropForeignKey
ALTER TABLE "Consulta_involucrados" DROP CONSTRAINT "Consulta_involucrados_id_involucrado_fkey";

-- AlterTable
ALTER TABLE "Archivo" DROP COLUMN "ruta",
ADD COLUMN     "url" TEXT NOT NULL,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Consulta" ADD COLUMN     "direccion_accionado" TEXT,
ADD COLUMN     "direccion_accionante" TEXT NOT NULL,
ADD COLUMN     "email_accionado" TEXT,
ADD COLUMN     "email_accionante" TEXT NOT NULL,
ADD COLUMN     "fecha_finalizacion" TIMESTAMP(3),
ADD COLUMN     "nombre_accionado" TEXT NOT NULL,
ADD COLUMN     "nombre_accionante" TEXT NOT NULL,
ADD COLUMN     "telefono_accionado" TEXT,
ADD COLUMN     "telefono_accionante" TEXT NOT NULL;

-- DropTable
DROP TABLE "Consulta_involucrados";

-- DropTable
DROP TABLE "Persona_involucrada";

-- DropEnum
DROP TYPE "TipoArchivo";

-- DropEnum
DROP TYPE "TipoInvolucrado";
