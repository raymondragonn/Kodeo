-- ============================================================
--  Kodeo — migración única de producción (Hostinger, hosting compartido)
--
--  Deja la base de datos al día con el backend actual. Consolida, en orden
--  de dependencias, todas las migraciones del directorio database/:
--    oauth · password_reset · orders_payment_intent · appointments (+ calls,
--    panel, whatsapp, video_url, reminders, survey) · projects_payment_orders
--    · projects_diagnostic · project_reviews (+ details, author) ·
--    project_activity
--
--  Idempotente: cada objeto se crea solo si falta. Correrlo dos veces no da
--  error ni toca datos existentes. No borra ni modifica ninguna fila.
--
--  Requisito previo: las tablas `users` y `orders` ya deben existir
--  (database/init.sql). Si la base está vacía, aplicar init.sql primero.
--
--  Aplicar: phpMyAdmin -> seleccionar la base -> pestaña SQL -> pegar -> Continuar.
-- ============================================================

SET @db := DATABASE();

-- =====================================================================
--  1. users — OAuth y recuperación de contraseña
-- =====================================================================

-- Las cuentas OAuth no tienen contraseña local.
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='oauth_provider'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL AFTER password_hash'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='oauth_id'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255) NULL AFTER oauth_provider'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='verified_at'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL AFTER oauth_id'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='reset_token_hash'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255) NULL AFTER verified_at'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='reset_token_expires'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token_hash'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND INDEX_NAME='uq_users_oauth'),
  'SELECT 1',
  'ALTER TABLE users ADD UNIQUE KEY uq_users_oauth (oauth_provider, oauth_id)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
--  2. orders — vínculo con el PaymentIntent de Stripe
--     El UNIQUE es lo que evita pedidos duplicados entre el webhook y
--     confirm-payment.php.
-- =====================================================================

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='stripe_payment_intent_id'),
  'SELECT 1',
  'ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER delivery_date'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND INDEX_NAME='uq_orders_payment_intent'),
  'SELECT 1',
  'ALTER TABLE orders ADD UNIQUE KEY uq_orders_payment_intent (stripe_payment_intent_id)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
--  3. appointments — citas y llamadas
--     Va antes que `projects` porque projects.appointment_id la referencia.
-- =====================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                  BIGINT UNSIGNED NULL,
  project_id               BIGINT UNSIGNED NULL,
  attendee_email           VARCHAR(191) NULL,
  whatsapp                 VARCHAR(30) NULL,
  cal_booking_uid          VARCHAR(255) NULL,
  service                  VARCHAR(120) NULL,
  service_code             VARCHAR(10) NULL,
  call_type                ENUM('intro','design_review','delivery','panel') NOT NULL DEFAULT 'intro',
  scheduled_at             DATETIME NULL,
  status                   ENUM('pending','confirmed','cancelled','rescheduled','form_submitted','completado') DEFAULT 'pending',
  project_details          TEXT NULL,
  form_released            TINYINT(1) NOT NULL DEFAULT 0,
  feedback                 TEXT NULL,
  payment_enabled          TINYINT(1) DEFAULT 0,
  amount                   DECIMAL(10,2) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  reminder_sent_at         DATETIME NULL,
  video_url                VARCHAR(500) NULL,
  created_at               TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_cal_booking_uid (cal_booking_uid),
  UNIQUE KEY uq_appointments_payment_intent (stripe_payment_intent_id),
  KEY idx_appointments_user (user_id),
  KEY idx_appointments_project (project_id),
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columnas que se fueron agregando después (por si la tabla ya existía).

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='project_id'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER user_id'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='whatsapp'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN whatsapp VARCHAR(30) NULL AFTER attendee_email'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='form_released'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN form_released TINYINT(1) NOT NULL DEFAULT 0 AFTER project_details'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='feedback'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN feedback TEXT NULL AFTER form_released'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='reminder_sent_at'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN reminder_sent_at DATETIME NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='appointments' AND COLUMN_NAME='video_url'),
  'SELECT 1',
  'ALTER TABLE appointments ADD COLUMN video_url VARCHAR(500) NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Citas del Panel ('panel') y estatus vigentes.
ALTER TABLE appointments
  MODIFY COLUMN call_type ENUM('intro','design_review','delivery','panel') NOT NULL DEFAULT 'intro';

UPDATE appointments SET status = 'form_submitted' WHERE status = 'details_submitted';

ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','confirmed','cancelled','rescheduled','form_submitted','completado') DEFAULT 'pending';

-- =====================================================================
--  4. projects — proyectos de clientes (user_id NULL = prospecto sin cuenta)
-- =====================================================================

CREATE TABLE IF NOT EXISTS projects (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NULL,
  user_id        BIGINT UNSIGNED NULL,
  name           VARCHAR(160) NOT NULL,
  status         ENUM('diagnostico','en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno',
  notes          TEXT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='projects' AND COLUMN_NAME='appointment_id'),
  'SELECT 1',
  'ALTER TABLE projects ADD COLUMN appointment_id BIGINT UNSIGNED NULL AFTER id'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='projects' AND INDEX_NAME='uq_projects_appointment'),
  'SELECT 1',
  'ALTER TABLE projects ADD UNIQUE KEY uq_projects_appointment (appointment_id)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='projects' AND CONSTRAINT_NAME='fk_projects_appointment'),
  'SELECT 1',
  'ALTER TABLE projects ADD CONSTRAINT fk_projects_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Contacto manual del cliente cuando el proyecto no tiene cuenta ligada
-- (creado a mano por el admin, sin link de pago de por medio). Los SELECT
-- hacen COALESCE(u.name, p.client_name): al ligarse el usuario, manda la cuenta.
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='projects' AND COLUMN_NAME='client_name'),
  'SELECT 1',
  'ALTER TABLE projects ADD COLUMN client_name VARCHAR(120) NULL AFTER user_id'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='projects' AND COLUMN_NAME='client_email'),
  'SELECT 1',
  'ALTER TABLE projects ADD COLUMN client_email VARCHAR(190) NULL AFTER client_name'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Estatus 'diagnostico' (proyecto nacido de una llamada de diagnóstico).
ALTER TABLE projects
  MODIFY COLUMN status ENUM('diagnostico','en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno';

-- =====================================================================
--  5. payment_orders — órdenes de pago con link único
-- =====================================================================

CREATE TABLE IF NOT EXISTS payment_orders (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id               BIGINT UNSIGNED NOT NULL,
  public_token             CHAR(32) NOT NULL,
  descripcion              VARCHAR(500) NOT NULL DEFAULT '',
  amount                   DECIMAL(10,2) NOT NULL,
  currency                 CHAR(3) NOT NULL DEFAULT 'MXN',
  tipo_pago                ENUM('transferencia','stripe') NOT NULL DEFAULT 'stripe',
  status                   ENUM('pendiente','pagado','cancelado') NOT NULL DEFAULT 'pendiente',
  permite_msi              TINYINT(1) NOT NULL DEFAULT 0,
  es_cargo_extra           TINYINT(1) NOT NULL DEFAULT 0,
  stripe_payment_intent_id VARCHAR(255) NULL,
  paid_at                  DATETIME NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_orders_token (public_token),
  UNIQUE KEY uq_payment_orders_pi (stripe_payment_intent_id),
  KEY idx_payment_orders_project (project_id),
  CONSTRAINT fk_payment_orders_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  6. project_reviews — encuesta de satisfacción
--     `puede_publicar` es el consentimiento del cliente; `autor_nombre` /
--     `autor_rol` son los datos con los que aceptó aparecer. `mejoras` es
--     crítica interna y nunca se publica.
-- =====================================================================

CREATE TABLE IF NOT EXISTS project_reviews (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  public_token CHAR(32) NOT NULL,
  rating       TINYINT UNSIGNED NULL,
  feedback     TEXT NULL,
  submitted_at DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_reviews_project (project_id),
  UNIQUE KEY uq_project_reviews_token (public_token),
  CONSTRAINT chk_project_reviews_rating CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  CONSTRAINT fk_project_reviews_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='rating_comunicacion'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN rating_comunicacion TINYINT UNSIGNED NULL AFTER rating'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='rating_diseno'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN rating_diseno TINYINT UNSIGNED NULL AFTER rating_comunicacion'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='rating_velocidad'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN rating_velocidad TINYINT UNSIGNED NULL AFTER rating_diseno'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='expectativas'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN expectativas ENUM(''supero'',''cumplio'',''parcial'',''no_cumplio'') NULL AFTER rating_velocidad'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='mejoras'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN mejoras TEXT NULL AFTER feedback'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='puede_publicar'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN puede_publicar TINYINT(1) NOT NULL DEFAULT 0 AFTER mejoras'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='autor_nombre'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN autor_nombre VARCHAR(120) NULL AFTER puede_publicar'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_reviews' AND COLUMN_NAME='autor_rol'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD COLUMN autor_rol VARCHAR(120) NULL AFTER autor_nombre'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='project_reviews' AND CONSTRAINT_NAME='chk_project_reviews_rating_comunicacion'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD CONSTRAINT chk_project_reviews_rating_comunicacion CHECK (rating_comunicacion IS NULL OR rating_comunicacion BETWEEN 1 AND 5)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='project_reviews' AND CONSTRAINT_NAME='chk_project_reviews_rating_diseno'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD CONSTRAINT chk_project_reviews_rating_diseno CHECK (rating_diseno IS NULL OR rating_diseno BETWEEN 1 AND 5)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='project_reviews' AND CONSTRAINT_NAME='chk_project_reviews_rating_velocidad'),
  'SELECT 1',
  'ALTER TABLE project_reviews ADD CONSTRAINT chk_project_reviews_rating_velocidad CHECK (rating_velocidad IS NULL OR rating_velocidad BETWEEN 1 AND 5)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
--  7. project_activity — bitácora del ciclo de vida del proyecto
-- =====================================================================

CREATE TABLE IF NOT EXISTS project_activity (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  event      VARCHAR(40) NOT NULL,
  detail     VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_activity_project (project_id),
  CONSTRAINT fk_project_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
