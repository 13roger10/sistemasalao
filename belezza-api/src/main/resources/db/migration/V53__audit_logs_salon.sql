-- BUG-006 (auditoria): audit_logs não tinha salão, e /api/audit-logs listava as ações de
-- todos os salões para qualquer admin. Logs antigos ficam sem salão (salon_id NULL) e não
-- aparecem para nenhum salão.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS salon_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_salon_criado ON audit_logs (salon_id, criado_em DESC);
