-- Bloqueio da conta após 6 senhas erradas seguidas: só volta com a redefinição de senha ou o
-- desbloqueio pelo admin (gravado no banco para valer em todas as instâncias da API).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tentativas_login_falhas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_bloqueado_em TIMESTAMP;
