ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30) NULL AFTER attendee_email;
