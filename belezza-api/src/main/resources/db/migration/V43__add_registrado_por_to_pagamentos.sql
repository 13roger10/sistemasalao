-- Rastreia qual usuário registrou cada pagamento.
-- Necessário para restringir RECEPCIONISTA a ver apenas suas próprias movimentações.
ALTER TABLE pagamentos
    ADD COLUMN IF NOT EXISTS registrado_por_id   BIGINT      NULL,
    ADD COLUMN IF NOT EXISTS registrado_por_nome VARCHAR(150) NULL;

CREATE INDEX IF NOT EXISTS idx_pagamento_registrado_por
    ON pagamentos (registrado_por_id);
