-- ============================================================
--  Migración: autoría de las reseñas publicables
--
--  `puede_publicar` cubre el consentimiento sobre el TEXTO, pero la tabla no
--  guardaba con qué nombre aparecer. Hasta ahora el nombre solo podía sacarse
--  por JOIN a users.name — un dato que el cliente dio para su cuenta, no para
--  publicarse, y que además es NULL en proyectos de prospectos sin cuenta.
--
--  Estos dos campos los llena el propio cliente en /resena/{token}, así que el
--  consentimiento es explícito y el schema Review puede declarar un autor
--  legítimo (Google prefiere las reseñas con autor).
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_review_author.sql
-- ============================================================

USE `kodeo-website`;

ALTER TABLE project_reviews
  ADD COLUMN autor_nombre VARCHAR(120) NULL AFTER puede_publicar,
  ADD COLUMN autor_rol    VARCHAR(120) NULL AFTER autor_nombre;
