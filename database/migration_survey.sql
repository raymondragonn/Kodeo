-- Agregar estado 'completado' y columna 'feedback' a appointments
ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','confirmed','cancelled','rescheduled','details_submitted','completado') DEFAULT 'pending',
  ADD COLUMN feedback TEXT NULL AFTER project_details;
