/*
  Warnings:

  - Changed the type of `nivel_estudio` on the `PerfilSocioEconomico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `estrato` on the `PerfilSocioEconomico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sisben` on the `PerfilSocioEconomico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `nivel_ingreso_economico` on the `PerfilSocioEconomico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tipo_identificacion` on the `Solicitante` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `genero` on the `Solicitante` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `discapacidad` on the `Solicitante` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `vulnerabilidad` on the `Solicitante` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "PerfilSocioEconomico" DROP COLUMN "nivel_estudio",
ADD COLUMN     "nivel_estudio" TEXT NOT NULL,
DROP COLUMN "estrato",
ADD COLUMN     "estrato" TEXT NOT NULL,
DROP COLUMN "sisben",
ADD COLUMN     "sisben" TEXT NOT NULL,
DROP COLUMN "nivel_ingreso_economico",
ADD COLUMN     "nivel_ingreso_economico" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Solicitante" DROP COLUMN "tipo_identificacion",
ADD COLUMN     "tipo_identificacion" TEXT NOT NULL,
DROP COLUMN "genero",
ADD COLUMN     "genero" TEXT NOT NULL,
DROP COLUMN "discapacidad",
ADD COLUMN     "discapacidad" TEXT NOT NULL,
DROP COLUMN "vulnerabilidad",
ADD COLUMN     "vulnerabilidad" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Discapacidad";

-- DropEnum
DROP TYPE "Estrato";

-- DropEnum
DROP TYPE "Genero";

-- DropEnum
DROP TYPE "NivelEstudio";

-- DropEnum
DROP TYPE "NivelIngresoEconomico";

-- DropEnum
DROP TYPE "Sisben";

-- DropEnum
DROP TYPE "TipoIdentificacion";

-- DropEnum
DROP TYPE "Vulnerabilidad";
