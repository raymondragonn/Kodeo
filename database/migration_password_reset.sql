-- Recuperación de contraseña: agrega el token (hasheado) y su expiración.
ALTER TABLE users
  ADD COLUMN reset_token_hash    VARCHAR(255) NULL AFTER verified_at,
  ADD COLUMN reset_token_expires DATETIME     NULL AFTER reset_token_hash;
