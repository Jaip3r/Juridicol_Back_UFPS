/*
  Warnings:

  - Made the column `tipo_solicitante` on table `Solicitante` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EstadoRondaAsignacion" AS ENUM ('en_proceso', 'completada');

-- AlterTable
ALTER TABLE "Archivo" ADD COLUMN     "id_solicitud" INTEGER,
ALTER COLUMN "id_consulta" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Solicitante" ALTER COLUMN "tipo_solicitante" SET NOT NULL;

-- CreateTable
CREATE TABLE "Ronda_asignaciones" (
    "id" SERIAL NOT NULL,
    "area_derecho" "AreaDerecho" NOT NULL,
    "semestre" TEXT NOT NULL,
    "estado" "EstadoRondaAsignacion" NOT NULL DEFAULT 'en_proceso',
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "Ronda_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignacion_ronda" (
    "id" SERIAL NOT NULL,
    "id_ronda" INTEGER NOT NULL,
    "id_estudiante" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asignacion_ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comentario_docente" TEXT,
    "fecha_revision_docente" TIMESTAMP(3),
    "comentario_administrador" TEXT,
    "fecha_revision_administrador" TIMESTAMP(3),
    "id_consulta" INTEGER NOT NULL,
    "id_estudiante" INTEGER NOT NULL,
    "id_docente" INTEGER,
    "id_administrador" INTEGER,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ronda_asignaciones_area_derecho_semestre_idx" ON "Ronda_asignaciones"("area_derecho", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_ronda_id_ronda_id_estudiante_key" ON "Asignacion_ronda"("id_ronda", "id_estudiante");

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion_ronda" ADD CONSTRAINT "Asignacion_ronda_id_ronda_fkey" FOREIGN KEY ("id_ronda") REFERENCES "Ronda_asignaciones"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Asignacion_ronda" ADD CONSTRAINT "Asignacion_ronda_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_id_administrador_fkey" FOREIGN KEY ("id_administrador") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
