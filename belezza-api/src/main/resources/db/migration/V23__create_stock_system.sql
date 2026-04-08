-- =============================================
-- V23: Sistema de Controle de Estoque
-- Cadastro de produtos, controle de quantidade e alertas
-- =============================================

-- Tabela de categorias de produtos
CREATE TABLE categorias_produto (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(300),
    icone VARCHAR(50),
    cor VARCHAR(20),
    ordem INT NOT NULL DEFAULT 0,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de fornecedores
CREATE TABLE fornecedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150),
    cnpj VARCHAR(20),
    contato_nome VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    endereco VARCHAR(300),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    condicoes_pagamento VARCHAR(200),
    observacoes VARCHAR(500),
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    total_compras INT NOT NULL DEFAULT 0,
    ultima_compra TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE produtos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(500),
    sku VARCHAR(50),
    codigo_barras VARCHAR(50),
    imagem_url VARCHAR(500),
    categoria_id BIGINT REFERENCES categorias_produto(id),
    fornecedor_id BIGINT REFERENCES fornecedores(id),
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    estoque_atual INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    estoque_maximo INT,
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'UNIDADE',
    preco_custo DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(10,2),
    vendavel BOOLEAN NOT NULL DEFAULT FALSE,
    ultima_compra TIMESTAMP,
    ultima_movimentacao TIMESTAMP,
    consumo_medio_mensal DECIMAL(10,2),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_unidade_medida CHECK (unidade_medida IN ('UNIDADE', 'MILILITRO', 'LITRO', 'GRAMA', 'KILOGRAMA', 'PACOTE', 'CAIXA'))
);

-- Tabela de movimentações de estoque
CREATE TABLE movimentacoes_estoque (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    motivo VARCHAR(30) NOT NULL,
    quantidade INT NOT NULL,
    estoque_anterior INT NOT NULL,
    estoque_novo INT NOT NULL,
    custo_unitario DECIMAL(10,2),
    custo_total DECIMAL(10,2),
    agendamento_id BIGINT,
    compra_id BIGINT,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    observacoes VARCHAR(500),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tipo_mov CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
    CONSTRAINT chk_motivo_mov CHECK (motivo IN ('COMPRA', 'USO_SERVICO', 'AJUSTE_MANUAL', 'PERDA', 'DEVOLUCAO', 'TRANSFERENCIA', 'VENDA', 'INVENTARIO'))
);

-- Tabela de alertas de estoque
CREATE TABLE alertas_estoque (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    severidade VARCHAR(20) NOT NULL DEFAULT 'AVISO',
    estoque_atual INT NOT NULL,
    estoque_minimo INT NOT NULL,
    reconhecido BOOLEAN NOT NULL DEFAULT FALSE,
    reconhecido_em TIMESTAMP,
    reconhecido_por_id BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tipo_alerta CHECK (tipo IN ('ESTOQUE_BAIXO', 'SEM_ESTOQUE', 'VENCENDO')),
    CONSTRAINT chk_severidade CHECK (severidade IN ('AVISO', 'CRITICO'))
);

-- Índices para performance
CREATE INDEX idx_cat_prod_salon ON categorias_produto(salon_id);
CREATE INDEX idx_cat_prod_ativo ON categorias_produto(ativo);

CREATE INDEX idx_fornecedor_salon ON fornecedores(salon_id);
CREATE INDEX idx_fornecedor_cnpj ON fornecedores(cnpj);
CREATE INDEX idx_fornecedor_ativo ON fornecedores(ativo);

CREATE INDEX idx_produto_salon ON produtos(salon_id);
CREATE INDEX idx_produto_categoria ON produtos(categoria_id);
CREATE INDEX idx_produto_fornecedor ON produtos(fornecedor_id);
CREATE INDEX idx_produto_sku ON produtos(sku);
CREATE INDEX idx_produto_codigo_barras ON produtos(codigo_barras);
CREATE INDEX idx_produto_ativo ON produtos(ativo);
CREATE INDEX idx_produto_estoque ON produtos(estoque_atual, estoque_minimo);

CREATE INDEX idx_mov_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX idx_mov_salon ON movimentacoes_estoque(salon_id);
CREATE INDEX idx_mov_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX idx_mov_data ON movimentacoes_estoque(criado_em);

CREATE INDEX idx_alerta_produto ON alertas_estoque(produto_id);
CREATE INDEX idx_alerta_salon ON alertas_estoque(salon_id);
CREATE INDEX idx_alerta_tipo ON alertas_estoque(tipo);
CREATE INDEX idx_alerta_reconhecido ON alertas_estoque(reconhecido);

-- Comentários das tabelas
COMMENT ON TABLE categorias_produto IS 'Categorias de produtos do estoque';
COMMENT ON TABLE fornecedores IS 'Fornecedores de produtos do salão';
COMMENT ON TABLE produtos IS 'Produtos do estoque do salão';
COMMENT ON TABLE movimentacoes_estoque IS 'Histórico de movimentações de estoque';
COMMENT ON TABLE alertas_estoque IS 'Alertas de estoque baixo ou outros problemas';
COMMENT ON COLUMN produtos.unidade_medida IS 'Unidade de medida: UNIDADE, MILILITRO, LITRO, GRAMA, KILOGRAMA, PACOTE, CAIXA';
COMMENT ON COLUMN movimentacoes_estoque.tipo IS 'Tipo de movimentação: ENTRADA, SAIDA, AJUSTE';
COMMENT ON COLUMN movimentacoes_estoque.motivo IS 'Motivo da movimentação: COMPRA, USO_SERVICO, AJUSTE_MANUAL, etc.';
