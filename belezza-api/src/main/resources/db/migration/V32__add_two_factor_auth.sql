-- V32: Add Two-Factor Authentication (2FA) fields to usuarios table
-- and create backup_codes table

-- Add TOTP fields to usuarios
ALTER TABLE usuarios
    ADD COLUMN totp_secret VARCHAR(255),
    ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Create backup_codes table for 2FA recovery
CREATE TABLE backup_codes (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    code        VARCHAR(255) NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    usado_em    TIMESTAMP,
    criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backup_codes_usuario_id ON backup_codes(usuario_id);
CREATE INDEX idx_backup_codes_usuario_usado ON backup_codes(usuario_id, usado);
