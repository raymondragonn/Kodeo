-- ============================================================
--  kodeo-website — esquema inicial
--  Ejecutado automáticamente al crear el contenedor MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS `kodeo-website`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kodeo-website`;

-- ------------------------------------------------------------
--  users
--  Gestiona cuentas de clientes del portal Kodeo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)     NOT NULL,
  username      VARCHAR(60)      NOT NULL,
  role          ENUM('administrador','cliente') NOT NULL DEFAULT 'cliente',
  email         VARCHAR(191)     NOT NULL,
  password_hash VARCHAR(255)     NULL,
  oauth_provider VARCHAR(20)     NULL,
  oauth_id      VARCHAR(255)     NULL,
  verified_at   TIMESTAMP        NULL DEFAULT NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_oauth    (oauth_provider, oauth_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED  NOT NULL,
  service       VARCHAR(120)     NOT NULL,
  amount        DECIMAL(10,2)    NOT NULL DEFAULT 0,
  status        ENUM('pendiente','en_proceso','completado','cancelado') NOT NULL DEFAULT 'pendiente',
  notes         TEXT             NULL,
  start_date    DATE             NULL,
  delivery_date DATE             NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_orders_user (user_id),
  UNIQUE KEY uq_orders_payment_intent (stripe_payment_intent_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
