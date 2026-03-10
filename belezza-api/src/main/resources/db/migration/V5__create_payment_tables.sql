-- Belezza API - Migration V5
-- Create payment tables

CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL UNIQUE,
    salon_id BIGINT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    forma VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    transacao_id VARCHAR(100),
    processado_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pagamento_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pagamento_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT chk_pagamento_forma CHECK (forma IN ('DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'VALE')),
    CONSTRAINT chk_pagamento_status CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO', 'ESTORNADO')),
    CONSTRAINT chk_pagamento_valor CHECK (valor >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pagamento_agendamento ON pagamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_salon ON pagamentos(salon_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_status ON pagamentos(status);

COMMENT ON TABLE pagamentos IS 'Payments for appointments';
COMMENT ON COLUMN pagamentos.forma IS 'DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, VALE';
COMMENT ON COLUMN pagamentos.status IS 'PENDENTE, APROVADO, RECUSADO, ESTORNADO';
