-- ============================================================
--  Migración: proyectos + órdenes de pago personalizadas
--  Flujo de cierre de ventas: el admin crea un proyecto y le
--  asocia órdenes de pago (anticipo, liquidación, cargos extras).
--  Cada orden genera un link único /pago/orden/{public_token}.
--
--  Aplicar con:
--    docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_projects_payment_orders.sql
-- ============================================================

USE `kodeo-website`;

-- user_id es NULL cuando el proyecto se crea para un prospecto sin cuenta:
-- el primer usuario autenticado que abra el link de pago lo reclama.
CREATE TABLE IF NOT EXISTS projects (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,
  name        VARCHAR(160)    NOT NULL,
  status      ENUM('en_diseno','en_desarrollo','completado','cancelado') NOT NULL DEFAULT 'en_diseno',
  notes       TEXT            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tipo_pago registra cómo se liquidó (o se espera liquidar) la orden:
-- 'stripe' se fija al confirmar el PaymentIntent; 'transferencia' cuando
-- el admin la marca pagada manualmente.
CREATE TABLE IF NOT EXISTS payment_orders (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id     BIGINT UNSIGNED NOT NULL,
  public_token   CHAR(32)        NOT NULL,
  descripcion    VARCHAR(500)    NOT NULL DEFAULT '',
  amount         DECIMAL(10,2)   NOT NULL,
  currency       CHAR(3)         NOT NULL DEFAULT 'MXN',
  tipo_pago      ENUM('transferencia','stripe') NOT NULL DEFAULT 'stripe',
  status         ENUM('pendiente','pagado','cancelado') NOT NULL DEFAULT 'pendiente',
  permite_msi    TINYINT(1)      NOT NULL DEFAULT 0,
  es_cargo_extra TINYINT(1)      NOT NULL DEFAULT 0,
  stripe_payment_intent_id VARCHAR(255) NULL,
  paid_at        DATETIME        NULL,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_orders_token (public_token),
  UNIQUE KEY uq_payment_orders_pi (stripe_payment_intent_id),
  KEY idx_payment_orders_project (project_id),
  CONSTRAINT fk_payment_orders_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
