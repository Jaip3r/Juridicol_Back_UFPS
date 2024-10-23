-- Creación de indice de PostgreSQL que peremite optimizar las busquedas por texto completo
CREATE INDEX usuario_fulltext_idx ON "Usuario" USING gin(to_tsvector('spanish', codigo));