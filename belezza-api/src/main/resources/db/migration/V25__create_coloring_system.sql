-- =============================================
-- V25: Sistema de Consultoria de Coloração
-- Ficha de coloração e histórico de serviços
-- =============================================

-- Tabela de fichas de coloração
CREATE TABLE fichas_coloracao (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

    -- Análise de pele
    tom_pele VARCHAR(20),
    subtom_pele VARCHAR(20),

    -- Características do cabelo
    tipo_cabelo VARCHAR(20),
    cor_natural VARCHAR(50),
    cor_atual VARCHAR(50),
    porcentagem_brancos VARCHAR(20),
    textura_cabelo VARCHAR(50),
    porosidade VARCHAR(50),
    elasticidade VARCHAR(50),

    -- Histórico químico
    tem_quimica BOOLEAN NOT NULL DEFAULT FALSE,
    historico_quimico VARCHAR(500),
    ultima_quimica TIMESTAMP,

    -- Alergias e sensibilidades
    tem_alergia BOOLEAN NOT NULL DEFAULT FALSE,
    alergias VARCHAR(500),
    sensibilidade_couro BOOLEAN NOT NULL DEFAULT FALSE,

    -- Preferências
    preferencia_cores VARCHAR(500),
    cores_evitar VARCHAR(500),
    observacoes TEXT,

    -- Fotos de referência
    foto_referencia_1 VARCHAR(500),
    foto_referencia_2 VARCHAR(500),
    foto_referencia_3 VARCHAR(500),

    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_ficha_cliente_salon UNIQUE (cliente_id, salon_id),
    CONSTRAINT chk_tom_pele CHECK (tom_pele IS NULL OR tom_pele IN ('MUITO_CLARO', 'CLARO', 'MEDIO', 'MORENO_CLARO', 'MORENO', 'MORENO_ESCURO', 'NEGRO')),
    CONSTRAINT chk_subtom_pele CHECK (subtom_pele IS NULL OR subtom_pele IN ('QUENTE', 'FRIO', 'NEUTRO', 'OLIVA')),
    CONSTRAINT chk_tipo_cabelo CHECK (tipo_cabelo IS NULL OR tipo_cabelo IN ('LISO', 'ONDULADO', 'CACHEADO', 'CRESPO'))
);

-- Tabela de histórico de coloração
CREATE TABLE historico_coloracao (
    id BIGSERIAL PRIMARY KEY,
    ficha_id BIGINT NOT NULL REFERENCES fichas_coloracao(id) ON DELETE CASCADE,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id),
    profissional_id BIGINT NOT NULL REFERENCES profissionais(id),
    agendamento_id BIGINT REFERENCES agendamentos(id),
    data_servico TIMESTAMP NOT NULL,

    -- Técnica e produtos
    tecnica VARCHAR(30) NOT NULL,
    marca_tinta VARCHAR(100),
    nome_cor VARCHAR(100),
    numero_cor VARCHAR(50),
    oxidante VARCHAR(100),
    formulacao VARCHAR(200),

    -- Tempos
    tempo_aplicacao INT,
    tempo_pausa INT,

    -- Resultados
    cor_antes VARCHAR(50),
    cor_depois VARCHAR(50),
    resultado_obtido VARCHAR(50),
    satisfacao_cliente INT DEFAULT 5,

    -- Fotos
    foto_antes VARCHAR(500),
    foto_depois VARCHAR(500),

    -- Observações
    observacoes TEXT,
    recomendacoes VARCHAR(500),
    proxima_manutencao TIMESTAMP,

    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tecnica CHECK (tecnica IN ('GLOBAL', 'MECHAS', 'BALAYAGE', 'OMBRE', 'LUZES', 'RETOQUE_RAIZ', 'TONALIZACAO', 'REFLEXO', 'CALIFORNIANAS', 'MORENA_ILUMINADA', 'PLATINADO', 'VIVIDOS')),
    CONSTRAINT chk_satisfacao CHECK (satisfacao_cliente BETWEEN 1 AND 5)
);

-- Índices para performance
CREATE INDEX idx_ficha_cliente ON fichas_coloracao(cliente_id);
CREATE INDEX idx_ficha_salon ON fichas_coloracao(salon_id);

CREATE INDEX idx_hist_cor_ficha ON historico_coloracao(ficha_id);
CREATE INDEX idx_hist_cor_cliente ON historico_coloracao(cliente_id);
CREATE INDEX idx_hist_cor_profissional ON historico_coloracao(profissional_id);
CREATE INDEX idx_hist_cor_data ON historico_coloracao(data_servico);
CREATE INDEX idx_hist_cor_tecnica ON historico_coloracao(tecnica);

-- Comentários das tabelas
COMMENT ON TABLE fichas_coloracao IS 'Ficha de coloração com análise de pele e histórico do cliente';
COMMENT ON TABLE historico_coloracao IS 'Registro de serviços de coloração realizados';
COMMENT ON COLUMN fichas_coloracao.tom_pele IS 'Tom de pele: MUITO_CLARO, CLARO, MEDIO, MORENO_CLARO, MORENO, MORENO_ESCURO, NEGRO';
COMMENT ON COLUMN fichas_coloracao.subtom_pele IS 'Subtom de pele: QUENTE, FRIO, NEUTRO, OLIVA';
COMMENT ON COLUMN fichas_coloracao.tipo_cabelo IS 'Tipo de cabelo: LISO, ONDULADO, CACHEADO, CRESPO';
COMMENT ON COLUMN historico_coloracao.tecnica IS 'Técnica utilizada: GLOBAL, MECHAS, BALAYAGE, OMBRE, etc.';
