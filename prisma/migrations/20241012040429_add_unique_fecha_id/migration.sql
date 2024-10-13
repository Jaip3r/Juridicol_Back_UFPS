/*
  Warnings:

  - A unique constraint covering the columns `[fecha_registro,id]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Usuario_fecha_registro_id_key" ON "Usuario"("fecha_registro", "id");
