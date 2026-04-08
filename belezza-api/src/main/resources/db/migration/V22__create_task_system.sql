-- =============================================
-- V22: Sistema de Tarefas para Auxiliares
-- Sistema de gestão de tarefas de organização e limpeza
-- =============================================

-- Tabela principal de tarefas
CREATE TABLE tarefas_salon (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    recorrencia VARCHAR(20) NOT NULL DEFAULT 'NENHUMA',
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    criado_por_id BIGINT NOT NULL REFERENCES usuarios(id),
    atribuido_a_id BIGINT REFERENCES usuarios(id),
    data_prevista DATE NOT NULL,
    hora_prevista TIME,
    data_inicio TIMESTAMP,
    data_conclusao TIMESTAMP,
    observacoes VARCHAR(500),
    categoria VARCHAR(100),
    local VARCHAR(100),
    tempo_estimado_minutos INT NOT NULL DEFAULT 30,
    tempo_real_minutos INT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tarefa_status CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
    CONSTRAINT chk_tarefa_prioridade CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    CONSTRAINT chk_tarefa_recorrencia CHECK (recorrencia IN ('NENHUMA', 'DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL'))
);

-- Tabela de histórico de alterações
CREATE TABLE tarefas_historico (
    id BIGSERIAL PRIMARY KEY,
    tarefa_id BIGINT NOT NULL REFERENCES tarefas_salon(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    acao VARCHAR(50) NOT NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    descricao VARCHAR(500),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_tarefa_salon ON tarefas_salon(salon_id);
CREATE INDEX idx_tarefa_atribuido ON tarefas_salon(atribuido_a_id);
CREATE INDEX idx_tarefa_status ON tarefas_salon(status);
CREATE INDEX idx_tarefa_data_prevista ON tarefas_salon(data_prevista);
CREATE INDEX idx_tarefa_prioridade ON tarefas_salon(prioridade);
CREATE INDEX idx_tarefa_ativo ON tarefas_salon(ativo);
CREATE INDEX idx_tarefa_recorrencia ON tarefas_salon(recorrencia);
CREATE INDEX idx_tarefa_categoria ON tarefas_salon(categoria);

CREATE INDEX idx_tarefa_hist_tarefa ON tarefas_historico(tarefa_id);
CREATE INDEX idx_tarefa_hist_usuario ON tarefas_historico(usuario_id);
CREATE INDEX idx_tarefa_hist_data ON tarefas_historico(criado_em);

-- Comentários das tabelas
COMMENT ON TABLE tarefas_salon IS 'Tarefas de organização e limpeza do salão';
COMMENT ON TABLE tarefas_historico IS 'Histórico de alterações das tarefas';
COMMENT ON COLUMN tarefas_salon.recorrencia IS 'Tipo de recorrência: NENHUMA, DIARIA, SEMANAL, QUINZENAL, MENSAL';
COMMENT ON COLUMN tarefas_salon.categoria IS 'Categoria da tarefa: Limpeza, Organização, Manutenção, etc.';
COMMENT ON COLUMN tarefas_salon.local IS 'Local onde a tarefa deve ser realizada';
