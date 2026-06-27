CREATE TABLE IF NOT EXISTS appointments (
  id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                  BIGINT UNSIGNED NULL,
  attendee_email           VARCHAR(191),
  cal_booking_uid          VARCHAR(255) UNIQUE,
  service                  VARCHAR(120),
  service_code             VARCHAR(10),
  scheduled_at             DATETIME,
  status                   ENUM('pending','confirmed','cancelled','rescheduled','details_submitted') DEFAULT 'pending',
  project_details          TEXT,
  payment_enabled          BOOLEAN DEFAULT FALSE,
  amount                   DECIMAL(10,2),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
