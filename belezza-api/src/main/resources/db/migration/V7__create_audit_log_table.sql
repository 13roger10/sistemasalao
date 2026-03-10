-- Belezza API - Migration V7
-- Create audit log table

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    entidade_id BIGINT NOT NULL,
    usuario_id BIGINT,
    ip_address VARCHAR(45),
    dados_antigos TEXT,
    dados_novos TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_criado_em ON audit_logs(criado_em);

COMMENT ON TABLE audit_logs IS 'Audit trail for tracking important system actions';
