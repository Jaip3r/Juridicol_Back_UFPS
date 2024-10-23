/*
  Warnings:

  - A unique constraint covering the columns `[fecha_registro]` on the table `Solicitante` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_fecha_registro_key" ON "Solicitante"("fecha_registro");
