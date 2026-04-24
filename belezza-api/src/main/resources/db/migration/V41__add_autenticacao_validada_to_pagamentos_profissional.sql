ALTER TABLE pagamentos_profissional
    ADD COLUMN IF NOT EXISTS autenticacao_validada BOOLEAN NOT NULL DEFAULT FALSE;
