ALTER TABLE pagamentos_profissional
    ADD COLUMN IF NOT EXISTS recebimento_confirmado_em TIMESTAMP;
