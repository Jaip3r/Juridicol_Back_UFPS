-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('Cedula_de_ciudadania', 'Cedula_de_extranjeria', 'Pasaporte', 'Registro_civil', 'Permiso_especial_de_permanencia', 'VISA', 'Libreta_militar', 'Documento_de_identidad_indigena', 'Documento_de_identidad_de_comunidades_negras');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('Masculino', 'Femenino', 'Otro');

-- CreateEnum
CREATE TYPE "Discapacidad" AS ENUM ('Ninguna', 'Fisica', 'Intelectual', 'Mental', 'Psicosocial', 'Multiple', 'Sensorial', 'Auditiva');

-- CreateEnum
CREATE TYPE "Vulnerabilidad" AS ENUM ('Ninguna', 'Persona_con_discapacidad', 'Grupos_etnicos', 'Mujer_cabeza_de_hogar', 'Reintegrados', 'Adulto_mayor', 'Victima_del_conflicto', 'Poblacion_desplazada');

-- CreateEnum
CREATE TYPE "NivelEstudio" AS ENUM ('Primaria', 'Secundaria', 'Tecnico', 'Tecnologo', 'Universitario', 'Posgrado');

-- CreateEnum
CREATE TYPE "Estrato" AS ENUM ('Estrato_1', 'Estrato_2', 'Estrato_3', 'Estrato_4', 'Estrato_5', 'Estrato_6');

-- CreateEnum
CREATE TYPE "Sisben" AS ENUM ('Grupo_A', 'Grupo_B', 'Grupo_C', 'Grupo_D');

-- CreateEnum
CREATE TYPE "NivelIngresoEconomico" AS ENUM ('Sin_ingresos', 'Entre_0_y_3_salarios_minimos', 'Entre_3_y_6_salarios_minimos', 'Superior_a_6_salarios_minimos');

-- CreateTable
CREATE TABLE "Solicitante" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "primer_apellido" TEXT NOT NULL,
    "segundo_apellido" TEXT NOT NULL,
    "tipo_identificacion" "TipoIdentificacion" NOT NULL,
    "numero_identificacion" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "lugar_nacimiento" TEXT NOT NULL,
    "discapacidad" "Discapacidad" NOT NULL,
    "vulnerabilidad" "Vulnerabilidad" NOT NULL,
    "direccion_actual" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizcion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilSocioEconomico" (
    "id" SERIAL NOT NULL,
    "nivel_estudio" "NivelEstudio" NOT NULL,
    "estrato" "Estrato" NOT NULL,
    "sisben" "Sisben" NOT NULL,
    "oficio" TEXT NOT NULL,
    "nivel_ingreso_economico" "NivelIngresoEconomico" NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "barrio" TEXT NOT NULL,
    "id_solicitante" INTEGER NOT NULL,

    CONSTRAINT "PerfilSocioEconomico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_numero_identificacion_key" ON "Solicitante"("numero_identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilSocioEconomico_id_solicitante_key" ON "PerfilSocioEconomico"("id_solicitante");

-- AddForeignKey
ALTER TABLE "PerfilSocioEconomico" ADD CONSTRAINT "PerfilSocioEconomico_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "Solicitante"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
