-- ============================================================
--  Migración: bitácora de actividad de proyectos
--  Registra eventos clave del ciclo de vida de un proyecto (creación,
--  cambios de estatus, asignación de cliente, órdenes de pago, reseñas)
--  para mostrarlos en el detalle del proyecto dentro del panel de admin.
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_project_activity.sql
-- ============================================================

USE `kodeo-website`;

CREATE TABLE IF NOT EXISTS project_activity (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  event      VARCHAR(40)  NOT NULL,
  detail     VARCHAR(500) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_project_activity_project (project_id),
  CONSTRAINT fk_project_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
