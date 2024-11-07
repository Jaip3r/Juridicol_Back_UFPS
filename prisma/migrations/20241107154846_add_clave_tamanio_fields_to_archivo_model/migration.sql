/*
  Warnings:

  - You are about to drop the column `url` on the `Archivo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clave]` on the table `Archivo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clave` to the `Archivo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tamanio` to the `Archivo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Archivo" DROP COLUMN "url",
ADD COLUMN     "clave" TEXT NOT NULL,
ADD COLUMN     "tamanio" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Archivo_clave_key" ON "Archivo"("clave");
