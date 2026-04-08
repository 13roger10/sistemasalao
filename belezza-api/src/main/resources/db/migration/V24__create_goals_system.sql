-- =============================================
-- V24: Sistema de Metas
-- Definir metas de faturamento, atendimentos e novos clientes
-- =============================================

-- Tabela de metas
CREATE TABLE metas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(500),
    tipo VARCHAR(30) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    valor_meta DECIMAL(15,2) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    profissional_id BIGINT REFERENCES profissionais(id),
    criado_por_id BIGINT NOT NULL REFERENCES usuarios(id),
    notificar_progresso BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_ao_atingir INT NOT NULL DEFAULT 80,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tipo_meta CHECK (tipo IN ('FATURAMENTO', 'ATENDIMENTOS', 'NOVOS_CLIENTES', 'TICKET_MEDIO', 'SERVICOS_TIPO')),
    CONSTRAINT chk_periodo_meta CHECK (periodo IN ('DIARIO', 'SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL')),
    CONSTRAINT chk_notificar_percentual CHECK (notificar_ao_atingir BETWEEN 1 AND 100)
);

-- Tabela de histórico de metas
CREATE TABLE historico_metas (
    id BIGSERIAL PRIMARY KEY,
    meta_id BIGINT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
    data_registro DATE NOT NULL,
    valor_anterior DECIMAL(15,2) NOT NULL,
    valor_novo DECIMAL(15,2) NOT NULL,
    variacao DECIMAL(15,2) NOT NULL,
    percentual_progresso DECIMAL(5,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_meta_salon ON metas(salon_id);
CREATE INDEX idx_meta_tipo ON metas(tipo);
CREATE INDEX idx_meta_periodo ON metas(data_inicio, data_fim);
CREATE INDEX idx_meta_profissional ON metas(profissional_id);
CREATE INDEX idx_meta_ativo ON metas(ativo);

CREATE INDEX idx_hist_meta ON historico_metas(meta_id);
CREATE INDEX idx_hist_meta_data ON historico_metas(data_registro);

-- Comentários das tabelas
COMMENT ON TABLE metas IS 'Metas do salão (faturamento, atendimentos, etc.)';
COMMENT ON TABLE historico_metas IS 'Histórico de progresso das metas';
COMMENT ON COLUMN metas.tipo IS 'Tipo da meta: FATURAMENTO, ATENDIMENTOS, NOVOS_CLIENTES, TICKET_MEDIO, SERVICOS_TIPO';
COMMENT ON COLUMN metas.periodo IS 'Período da meta: DIARIO, SEMANAL, MENSAL, TRIMESTRAL, ANUAL';
COMMENT ON COLUMN metas.notificar_ao_atingir IS 'Percentual mínimo para notificação de progresso (1-100)';
