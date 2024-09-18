/*
  Warnings:

  - You are about to drop the column `celular` on the `Solicitante` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Solicitante` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numero_contacto` to the `Solicitante` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoConsulta" AS ENUM ('asesoria_verbal', 'consulta');

-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('pendiente', 'asignado', 'cerrado');

-- CreateEnum
CREATE TYPE "TipoInvolucrado" AS ENUM ('Accionante', 'Accionado');

-- CreateEnum
CREATE TYPE "TipoArchivo" AS ENUM ('PDF', 'Imagen');

-- AlterTable
ALTER TABLE "Solicitante" DROP COLUMN "celular",
ADD COLUMN     "numero_contacto" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "puedeRecepionar" SET DEFAULT true;

-- CreateTable
CREATE TABLE "Consulta" (
    "id" SERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "tipo_consulta" "TipoConsulta" NOT NULL,
    "area_derecho" "AreaDerecho" NOT NULL,
    "hechos" TEXT NOT NULL,
    "pretensiones" TEXT NOT NULL,
    "observaciones" TEXT NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'pendiente',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_asignacion" TIMESTAMP(3),
    "id_solicitente" INTEGER NOT NULL,
    "id_estudiante_registro" INTEGER NOT NULL,
    "id_estudiante_asignado" INTEGER,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "tipo" "TipoArchivo" NOT NULL,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "id_consulta" INTEGER NOT NULL,

    CONSTRAINT "Archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona_involucrada" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_involucrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta_involucrados" (
    "id_consulta" INTEGER NOT NULL,
    "id_involucrado" INTEGER NOT NULL,
    "tipo" "TipoInvolucrado" NOT NULL,

    CONSTRAINT "Consulta_involucrados_pkey" PRIMARY KEY ("id_consulta","id_involucrado")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consulta_radicado_key" ON "Consulta"("radicado");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_involucrada_correo_key" ON "Persona_involucrada"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_email_key" ON "Solicitante"("email");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_solicitente_fkey" FOREIGN KEY ("id_solicitente") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_estudiante_registro_fkey" FOREIGN KEY ("id_estudiante_registro") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_estudiante_asignado_fkey" FOREIGN KEY ("id_estudiante_asignado") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta_involucrados" ADD CONSTRAINT "Consulta_involucrados_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta_involucrados" ADD CONSTRAINT "Consulta_involucrados_id_involucrado_fkey" FOREIGN KEY ("id_involucrado") REFERENCES "Persona_involucrada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
