-- Creación de indice de PostgreSQL que peremite optimizar las busquedas por texto completo
CREATE INDEX solicitante_fulltext_idx ON "Solicitante" USING gin(to_tsvector('spanish', nombre || ' ' || apellidos));
