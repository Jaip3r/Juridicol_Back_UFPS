/*
  Warnings:

  - You are about to drop the column `primer_apellido` on the `Solicitante` table. All the data in the column will be lost.
  - You are about to drop the column `segundo_apellido` on the `Solicitante` table. All the data in the column will be lost.
  - Added the required column `apellidos` to the `Solicitante` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Solicitante" DROP COLUMN "primer_apellido",
DROP COLUMN "segundo_apellido",
ADD COLUMN     "apellidos" TEXT NOT NULL;
