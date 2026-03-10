-- =============================================
-- V14: Sistema de Comissao Automatica
-- Sprint 7 - Comissao por porcentagem ou valor fixo
-- =============================================

-- Adicionar campos de comissao na tabela salons (configuracao padrao)
ALTER TABLE salons ADD COLUMN tipo_comissao_padrao VARCHAR(20) DEFAULT 'PORCENTAGEM';
ALTER TABLE salons ADD COLUMN valor_comissao_padrao DECIMAL(10,2) DEFAULT 10.00;

-- Adicionar campos de comissao na tabela profissionais
ALTER TABLE profissionais ADD COLUMN tipo_comissao VARCHAR(20);
ALTER TABLE profissionais ADD COLUMN valor_comissao DECIMAL(10,2);

-- Comentarios dos novos campos
COMMENT ON COLUMN salons.tipo_comissao_padrao IS 'Tipo de comissao padrao do salao: PORCENTAGEM ou FIXO';
COMMENT ON COLUMN salons.valor_comissao_padrao IS 'Valor da comissao padrao (percentual ou valor fixo)';
COMMENT ON COLUMN profissionais.tipo_comissao IS 'Tipo de comissao do profissional: PORCENTAGEM ou FIXO (null = usa padrao do salao)';
COMMENT ON COLUMN profissionais.valor_comissao IS 'Valor da comissao do profissional (null = usa padrao do salao)';

-- Tabela de comissoes calculadas
CREATE TABLE comissoes (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    profissional_id BIGINT NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    agendamento_id BIGINT NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    valor_servico DECIMAL(10,2) NOT NULL,
    tipo_comissao VARCHAR(20) NOT NULL,
    taxa_comissao DECIMAL(10,2) NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CALCULADA',
    pagamento_profissional_id BIGINT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_comissao_tipo CHECK (tipo_comissao IN ('PORCENTAGEM', 'FIXO')),
    CONSTRAINT chk_comissao_status CHECK (status IN ('CALCULADA', 'PAGA', 'CANCELADA')),
    CONSTRAINT uk_comissao_agendamento UNIQUE (agendamento_id)
);

-- Tabela de pagamentos aos profissionais (consolidado)
CREATE TABLE pagamentos_profissional (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    profissional_id BIGINT NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    total_servicos INT NOT NULL DEFAULT 0,
    valor_total_servicos DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total_comissoes DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    observacoes TEXT,
    referencia_transacao VARCHAR(100),
    pago_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pagamento_prof_status CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'PAGO', 'CANCELADO'))
);

-- Foreign key de comissoes para pagamentos_profissional
ALTER TABLE comissoes ADD CONSTRAINT fk_comissao_pagamento
    FOREIGN KEY (pagamento_profissional_id) REFERENCES pagamentos_profissional(id);

-- Indices para performance
CREATE INDEX idx_comissoes_salon ON comissoes(salon_id);
CREATE INDEX idx_comissoes_profissional ON comissoes(profissional_id);
CREATE INDEX idx_comissoes_agendamento ON comissoes(agendamento_id);
CREATE INDEX idx_comissoes_status ON comissoes(status);
CREATE INDEX idx_comissoes_pagamento ON comissoes(pagamento_profissional_id);
CREATE INDEX idx_comissoes_data ON comissoes(criado_em);

CREATE INDEX idx_pagamentos_prof_salon ON pagamentos_profissional(salon_id);
CREATE INDEX idx_pagamentos_prof_profissional ON pagamentos_profissional(profissional_id);
CREATE INDEX idx_pagamentos_prof_status ON pagamentos_profissional(status);
CREATE INDEX idx_pagamentos_prof_periodo ON pagamentos_profissional(periodo_inicio, periodo_fim);

-- Comentarios das tabelas
COMMENT ON TABLE comissoes IS 'Registro de comissoes calculadas por agendamento concluido';
COMMENT ON TABLE pagamentos_profissional IS 'Consolidacao de pagamentos de comissoes aos profissionais';
COMMENT ON COLUMN comissoes.taxa_comissao IS 'Valor percentual ou fixo aplicado no calculo';
COMMENT ON COLUMN comissoes.valor_comissao IS 'Valor final da comissao calculada';
COMMENT ON COLUMN pagamentos_profissional.valor_total_servicos IS 'Soma dos valores dos servicos no periodo';
COMMENT ON COLUMN pagamentos_profissional.valor_total_comissoes IS 'Soma das comissoes a pagar no periodo';
