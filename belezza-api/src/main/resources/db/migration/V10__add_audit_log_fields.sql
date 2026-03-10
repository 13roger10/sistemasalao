-- Belezza API - Migration V10
-- Add additional fields to audit_logs table

-- Add new columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(150);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS detalhes VARCHAR(500);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS sucesso BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mensagem_erro VARCHAR(500);

-- Expand entidade column to 100 chars
ALTER TABLE audit_logs ALTER COLUMN entidade TYPE VARCHAR(100);

-- Add index for acao column
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs(acao);

-- Add comments
COMMENT ON COLUMN audit_logs.usuario_nome IS 'Name of the user who performed the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/app user agent string';
COMMENT ON COLUMN audit_logs.detalhes IS 'Additional details about the action';
COMMENT ON COLUMN audit_logs.sucesso IS 'Whether the action was successful';
COMMENT ON COLUMN audit_logs.mensagem_erro IS 'Error message if action failed';
