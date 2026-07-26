-- ============================================================
--  Migración: reseñas de proyectos completados
--  Al marcar un proyecto como 'completado' se genera un link único
--  /resena/{public_token} para que el cliente califique (0-5) y
--  deje comentario, sin necesidad de iniciar sesión.
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_project_reviews.sql
-- ============================================================

USE `kodeo-website`;

CREATE TABLE IF NOT EXISTS project_reviews (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  public_token CHAR(32)        NOT NULL,
  rating       TINYINT UNSIGNED NULL,
  feedback     TEXT            NULL,
  submitted_at DATETIME        NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_project_reviews_project (project_id),
  UNIQUE KEY uq_project_reviews_token (public_token),
  CONSTRAINT chk_project_reviews_rating CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  CONSTRAINT fk_project_reviews_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
