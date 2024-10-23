/*
  Warnings:

  - You are about to drop the column `fecha_actualizcion` on the `Solicitante` table. All the data in the column will be lost.
  - Added the required column `fecha_actualizacion` to the `Solicitante` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Solicitante" RENAME COLUMN "fecha_actualizcion" TO "fecha_actualizacion";
