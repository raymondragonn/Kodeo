USE `kodeo-website`;

ALTER TABLE projects
  ADD COLUMN appointment_id BIGINT UNSIGNED NULL AFTER id,
  MODIFY COLUMN status ENUM('diagnostico','en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno',
  ADD UNIQUE KEY uq_projects_appointment (appointment_id),
  ADD CONSTRAINT fk_projects_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
