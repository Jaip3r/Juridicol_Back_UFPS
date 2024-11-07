-- CreateTable
CREATE TABLE "RadicadoCounter" (
    "id" SERIAL NOT NULL,
    "area_derecho" "AreaDerecho" NOT NULL,
    "semestre" TEXT NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RadicadoCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RadicadoCounter_area_derecho_semestre_key" ON "RadicadoCounter"("area_derecho", "semestre");
