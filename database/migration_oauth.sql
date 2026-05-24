ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN oauth_provider VARCHAR(20)  NULL AFTER password_hash,
  ADD COLUMN oauth_id       VARCHAR(255) NULL AFTER oauth_provider,
  ADD UNIQUE KEY uq_users_oauth (oauth_provider, oauth_id);
