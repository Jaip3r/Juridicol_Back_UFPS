/*
  Warnings:

  - You are about to drop the column `barrio` on the `PerfilSocioEconomico` table. All the data in the column will be lost.
  - You are about to drop the column `ciudad` on the `PerfilSocioEconomico` table. All the data in the column will be lost.
  - You are about to drop the column `departamento` on the `PerfilSocioEconomico` table. All the data in the column will be lost.
  - Added the required column `actividad_economica` to the `PerfilSocioEconomico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ciudad` to the `Solicitante` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PerfilSocioEconomico" DROP COLUMN "barrio",
DROP COLUMN "ciudad",
DROP COLUMN "departamento",
ADD COLUMN     "actividad_economica" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Solicitante" ADD COLUMN     "ciudad" TEXT NOT NULL;
