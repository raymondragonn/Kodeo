-- ============================================================
--  Migración: contacto manual del cliente en proyectos
--
--  Un proyecto creado a mano por el admin queda con `user_id` NULL y el panel
--  decía "se liga al abrir su link de pago" — pero si nunca hubo link de pago,
--  nunca se ligaba y no había forma de saber de quién era el proyecto (ni la
--  reseña que se genera desde él).
--
--  Estos campos guardan el contacto que el admin captura a mano cuando el
--  cliente todavía no tiene cuenta. Los SELECT de projects.php hacen
--  COALESCE(u.name, p.client_name) — mismo patrón que appointments.php con
--  `attendee_email` — así que en cuanto el cliente se registra y el proyecto
--  se liga a su `user_id`, los datos de la cuenta mandan.
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_project_client_contact.sql
-- ============================================================

USE `kodeo-website`;

ALTER TABLE projects
  ADD COLUMN client_name  VARCHAR(120) NULL AFTER user_id,
  ADD COLUMN client_email VARCHAR(190) NULL AFTER client_name;
