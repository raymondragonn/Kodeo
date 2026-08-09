-- ============================================================
--  Migración: detalle extendido de reseñas de proyectos
--  Agrega las preguntas adicionales de la encuesta de satisfacción
--  (comunicación, diseño, velocidad, expectativas, mejoras, consentimiento
--  de publicación) a la tabla project_reviews.
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_review_details.sql
-- ============================================================

USE `kodeo-website`;

ALTER TABLE project_reviews
  ADD COLUMN rating_comunicacion TINYINT UNSIGNED NULL AFTER rating,
  ADD COLUMN rating_diseno       TINYINT UNSIGNED NULL AFTER rating_comunicacion,
  ADD COLUMN rating_velocidad    TINYINT UNSIGNED NULL AFTER rating_diseno,
  ADD COLUMN expectativas        ENUM('supero','cumplio','parcial','no_cumplio') NULL AFTER rating_velocidad,
  ADD COLUMN mejoras             TEXT NULL AFTER feedback,
  ADD COLUMN puede_publicar      TINYINT(1) NOT NULL DEFAULT 0 AFTER mejoras,
  ADD CONSTRAINT chk_project_reviews_rating_comunicacion CHECK (rating_comunicacion IS NULL OR rating_comunicacion BETWEEN 1 AND 5),
  ADD CONSTRAINT chk_project_reviews_rating_diseno       CHECK (rating_diseno IS NULL OR rating_diseno BETWEEN 1 AND 5),
  ADD CONSTRAINT chk_project_reviews_rating_velocidad    CHECK (rating_velocidad IS NULL OR rating_velocidad BETWEEN 1 AND 5);
