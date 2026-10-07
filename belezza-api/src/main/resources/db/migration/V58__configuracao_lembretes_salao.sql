-- BUG-026 (auditoria): a tela de lembretes automáticos não tinha backend (GET dava 404 e nada era
-- gravado). Cada salão escolhe se manda os lembretes por WhatsApp de 24 h e de 2 h antes do
-- horário. Salão sem linha aqui segue o padrão: os dois lembretes ligados.
CREATE TABLE IF NOT EXISTS configuracao_lembretes_salao (
    salon_id       BIGINT    PRIMARY KEY REFERENCES salons (id) ON DELETE CASCADE,
    ativo          BOOLEAN   NOT NULL DEFAULT TRUE,
    lembrete_24h   BOOLEAN   NOT NULL DEFAULT TRUE,
    lembrete_2h    BOOLEAN   NOT NULL DEFAULT TRUE,
    atualizado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
