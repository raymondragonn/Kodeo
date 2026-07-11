-- Citas agendadas desde el panel de clientes (confirmadas por WhatsApp):
-- nueva variante 'panel' de call_type. En estas filas service guarda el
-- proyecto/producto, service_code el tipo ('nuevo' | 'existente') y
-- project_details el motivo en texto plano. Se eliminan automáticamente
-- al pasar su fecha (limpieza en GET /appointments.php).
--
-- Aplicar con:
--   docker compose exec -T db mysql -ukodeo -pkodeopass kodeo-website < database/migration_panel_appointments.sql
ALTER TABLE appointments
  MODIFY COLUMN call_type ENUM('intro','design_review','delivery','panel') NOT NULL DEFAULT 'intro';
