/*
  Warnings:

  - A unique constraint covering the columns `[fecha_registro]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Usuario_fecha_registro_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_fecha_registro_key" ON "Usuario"("fecha_registro");
