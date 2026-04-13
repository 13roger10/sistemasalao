-- V33: Widen social account token columns to TEXT for AES-256-GCM encrypted values.
--
-- AES-256-GCM encrypted tokens have the format:
--   ENC:<base64url(12-byte IV)>.<base64url(ciphertext + 16-byte auth-tag)>
-- A typical Meta long-lived token (~200 chars) becomes ~300+ chars after encryption,
-- so VARCHAR(255) is too small. TEXT removes the size constraint entirely.

ALTER TABLE contas_sociais
    ALTER COLUMN access_token TYPE TEXT;

-- refresh_token column (if it exists — some platforms may not issue one)
ALTER TABLE contas_sociais
    ALTER COLUMN refresh_token TYPE TEXT;
