/*
  Warnings:

  - You are about to drop the column `id_solicitente` on the `Consulta` table. All the data in the column will be lost.
  - Added the required column `id_solicitante` to the `Consulta` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Consulta" DROP CONSTRAINT "Consulta_id_solicitente_fkey";

-- AlterTable
ALTER TABLE "Consulta" DROP COLUMN "id_solicitente",
ADD COLUMN     "id_solicitante" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
