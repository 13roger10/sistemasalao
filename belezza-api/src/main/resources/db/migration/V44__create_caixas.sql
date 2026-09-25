-- Controle de caixa real (antes a abertura/fechamento era simulada e nada era gravado).
-- Um caixa por salão aberto por vez; pagamentos passam a ficar vinculados ao caixa.

CREATE TABLE caixas (
    id                      BIGSERIAL PRIMARY KEY,
    salon_id                BIGINT        NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    status                  VARCHAR(20)   NOT NULL,
    aberto_por_id           BIGINT,
    aberto_por_nome         VARCHAR(150),
    aberto_em               TIMESTAMP     NOT NULL,
    saldo_inicial           DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacoes_abertura    VARCHAR(500),
    fechado_por_id          BIGINT,
    fechado_por_nome        VARCHAR(150),
    fechado_em              TIMESTAMP,
    saldo_informado         DECIMAL(10,2),
    saldo_esperado          DECIMAL(10,2),
    diferenca               DECIMAL(10,2),
    observacoes_fechamento  VARCHAR(500),
    total_entradas          DECIMAL(10,2),
    total_dinheiro          DECIMAL(10,2),
    total_pix               DECIMAL(10,2),
    total_credito           DECIMAL(10,2),
    total_debito            DECIMAL(10,2),
    total_vale              DECIMAL(10,2),
    total_despesas          DECIMAL(10,2),
    total_sangrias          DECIMAL(10,2),
    total_suprimentos       DECIMAL(10,2),
    criado_em               TIMESTAMP     NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMP,
    CONSTRAINT chk_caixa_status CHECK (status IN ('ABERTO', 'FECHADO')),
    CONSTRAINT chk_caixa_saldo_inicial CHECK (saldo_inicial >= 0)
);

CREATE INDEX idx_caixa_salon_aberto_em ON caixas (salon_id, aberto_em);

-- Garante no banco que um salão nunca tem dois caixas abertos ao mesmo tempo
CREATE UNIQUE INDEX ux_caixa_um_aberto_por_salao ON caixas (salon_id) WHERE status = 'ABERTO';

CREATE TABLE movimentacoes_caixa (
    id                  BIGSERIAL PRIMARY KEY,
    caixa_id            BIGINT        NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
    tipo                VARCHAR(20)   NOT NULL,
    valor               DECIMAL(10,2) NOT NULL,
    forma               VARCHAR(20)   NOT NULL,
    descricao           VARCHAR(300)  NOT NULL,
    categoria           VARCHAR(50),
    pagamento_id        BIGINT,
    registrado_por_id   BIGINT,
    registrado_por_nome VARCHAR(150),
    criado_em           TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_mov_caixa_tipo CHECK (tipo IN ('SANGRIA', 'SUPRIMENTO', 'DESPESA', 'RECEITA', 'ESTORNO')),
    CONSTRAINT chk_mov_caixa_valor CHECK (valor > 0)
);

CREATE INDEX idx_mov_caixa_caixa ON movimentacoes_caixa (caixa_id);

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS caixa_id BIGINT NULL REFERENCES caixas(id);
CREATE INDEX IF NOT EXISTS idx_pagamento_caixa ON pagamentos (caixa_id);
