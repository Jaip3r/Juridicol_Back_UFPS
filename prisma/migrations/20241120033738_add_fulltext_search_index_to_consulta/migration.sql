-- Creación de indice de PostgreSQL que peremite optimizar las busquedas por texto completo
CREATE INDEX consulta_fulltext_idx ON "Consulta" USING gin(to_tsvector('spanish', radicado));