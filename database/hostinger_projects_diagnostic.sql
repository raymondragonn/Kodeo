SET @db := DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'appointment_id'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD COLUMN appointment_id BIGINT UNSIGNED NULL AFTER id'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE projects
  MODIFY COLUMN status ENUM('diagnostico','en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno';

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_projects_appointment'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD UNIQUE KEY uq_projects_appointment (appointment_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = @db AND CONSTRAINT_NAME = 'fk_projects_appointment'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD CONSTRAINT fk_projects_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
