SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NULL,
  attendee_email VARCHAR(191) NULL,
  whatsapp VARCHAR(30) NULL,
  cal_booking_uid VARCHAR(255) NULL,
  service VARCHAR(120) NULL,
  service_code VARCHAR(10) NULL,
  call_type ENUM('intro','design_review','delivery','panel') NOT NULL DEFAULT 'intro',
  scheduled_at DATETIME NULL,
  status ENUM('pending','confirmed','cancelled','rescheduled','form_submitted','completado') NOT NULL DEFAULT 'pending',
  project_details TEXT NULL,
  form_released TINYINT(1) NOT NULL DEFAULT 0,
  feedback TEXT NULL,
  payment_enabled TINYINT(1) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  video_url VARCHAR(500) NULL,
  reminder_sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_cal_booking_uid (cal_booking_uid),
  UNIQUE KEY uq_appointments_payment_intent (stripe_payment_intent_id),
  KEY idx_appointments_user (user_id),
  KEY idx_appointments_project (project_id),
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_project FOREIGN KEY (project_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  public_token CHAR(32) NOT NULL,
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  tipo_pago ENUM('transferencia','stripe') NOT NULL DEFAULT 'stripe',
  status ENUM('pendiente','pagado','cancelado') NOT NULL DEFAULT 'pendiente',
  permite_msi TINYINT(1) NOT NULL DEFAULT 0,
  es_cargo_extra TINYINT(1) NOT NULL DEFAULT 0,
  stripe_payment_intent_id VARCHAR(255) NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_orders_token (public_token),
  UNIQUE KEY uq_payment_orders_pi (stripe_payment_intent_id),
  KEY idx_payment_orders_project (project_id),
  CONSTRAINT fk_payment_orders_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_provider'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL AFTER password_hash'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_id'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255) NULL AFTER oauth_provider'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verified_at'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL AFTER oauth_id'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token_hash'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255) NULL AFTER verified_at'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token_expires'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token_hash'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_oauth'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD UNIQUE KEY uq_users_oauth (oauth_provider, oauth_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'stripe_payment_intent_id'
    ),
    'SELECT 1',
    'ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER delivery_date'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND INDEX_NAME = 'uq_orders_payment_intent'
    ),
    'SELECT 1',
    'ALTER TABLE orders ADD UNIQUE KEY uq_orders_payment_intent (stripe_payment_intent_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
