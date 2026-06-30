ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at DATETIME NULL;
