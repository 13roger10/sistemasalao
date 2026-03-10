-- =============================================
-- V13: Sistema de Fidelidade (10 cortes = 1 gratis)
-- =============================================

-- Programa de fidelidade do salao
CREATE TABLE fidelidade_programas (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    visitas_necessarias INT NOT NULL DEFAULT 10,
    recompensa_tipo VARCHAR(30) NOT NULL DEFAULT 'SERVICO_GRATIS',
    recompensa_valor DECIMAL(10,2),
    servico_recompensa_id BIGINT REFERENCES servicos(id),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_fidelidade_programa_salon UNIQUE (salon_id, nome)
);

-- Inscricao do cliente no programa
CREATE TABLE fidelidade_clientes (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    programa_id BIGINT NOT NULL REFERENCES fidelidade_programas(id) ON DELETE CASCADE,
    visitas_atuais INT NOT NULL DEFAULT 0,
    total_visitas INT NOT NULL DEFAULT 0,
    total_resgates INT NOT NULL DEFAULT 0,
    creditos_disponiveis INT NOT NULL DEFAULT 0,
    nivel VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    pontos_nivel INT NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_fidelidade_cliente_programa UNIQUE (cliente_id, programa_id)
);

-- Historico de transacoes de fidelidade
CREATE TABLE fidelidade_transacoes (
    id BIGSERIAL PRIMARY KEY,
    fidelidade_cliente_id BIGINT NOT NULL REFERENCES fidelidade_clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    visitas INT NOT NULL DEFAULT 0,
    creditos INT NOT NULL DEFAULT 0,
    agendamento_id BIGINT REFERENCES agendamentos(id),
    descricao VARCHAR(255),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fidelidade_transacao_tipo CHECK (tipo IN ('VISITA', 'RESGATE', 'BONUS', 'AJUSTE', 'EXPIRACAO'))
);

-- Indices para performance
CREATE INDEX idx_fidelidade_programas_salon ON fidelidade_programas(salon_id);
CREATE INDEX idx_fidelidade_programas_ativo ON fidelidade_programas(ativo);
CREATE INDEX idx_fidelidade_clientes_cliente ON fidelidade_clientes(cliente_id);
CREATE INDEX idx_fidelidade_clientes_programa ON fidelidade_clientes(programa_id);
CREATE INDEX idx_fidelidade_clientes_nivel ON fidelidade_clientes(nivel);
CREATE INDEX idx_fidelidade_transacoes_cliente ON fidelidade_transacoes(fidelidade_cliente_id);
CREATE INDEX idx_fidelidade_transacoes_tipo ON fidelidade_transacoes(tipo);
CREATE INDEX idx_fidelidade_transacoes_data ON fidelidade_transacoes(criado_em);

-- Comentarios
COMMENT ON TABLE fidelidade_programas IS 'Programas de fidelidade dos saloes';
COMMENT ON TABLE fidelidade_clientes IS 'Inscricao de clientes nos programas de fidelidade';
COMMENT ON TABLE fidelidade_transacoes IS 'Historico de transacoes (visitas, resgates, bonus)';
COMMENT ON COLUMN fidelidade_clientes.nivel IS 'Nivel do cliente: BRONZE, PRATA, OURO';
COMMENT ON COLUMN fidelidade_transacoes.tipo IS 'Tipo: VISITA, RESGATE, BONUS, AJUSTE, EXPIRACAO';
