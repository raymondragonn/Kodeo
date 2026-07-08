-- Flujo de proyecto con varias llamadas (consulta inicial, revisión de
-- diseño, entrega): cada llamada agendada en Cal.com es una fila en
-- appointments. La fila "intro" es la raíz del proyecto y sigue
-- concentrando project_details, payment_enabled, amount, feedback, etc.
-- Las llamadas 2 y 3 son filas ligeras enlazadas por project_id.
--
-- Reemplaza el valor 'details_submitted' de status por 'form_submitted'
-- (el formulario ya no se llena antes de agendar, sino después de la
-- primera llamada). El ENUM se amplía primero para permitir el nuevo
-- valor y recién después se retira el viejo, porque MySQL no permite
-- escribir un valor de ENUM que aún no existe en la columna.
ALTER TABLE appointments
  ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN call_type ENUM('intro','design_review','delivery') NOT NULL DEFAULT 'intro' AFTER service_code,
  ADD COLUMN form_released BOOLEAN NOT NULL DEFAULT FALSE AFTER project_details,
  ADD CONSTRAINT fk_appointments_project FOREIGN KEY (project_id) REFERENCES appointments(id) ON DELETE CASCADE,
  MODIFY COLUMN status ENUM('pending','confirmed','cancelled','rescheduled','details_submitted','form_submitted','completado') DEFAULT 'pending';

UPDATE appointments SET status = 'form_submitted' WHERE status = 'details_submitted';

ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','confirmed','cancelled','rescheduled','form_submitted','completado') DEFAULT 'pending';
