-- Belezza API - Migration V4
-- Create scheduling tables (clients, appointments, reviews)

-- Clients table (links a user to a specific salon)
CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    no_shows INT NOT NULL DEFAULT 0,
    total_agendamentos INT NOT NULL DEFAULT 0,
    observacoes VARCHAR(500),
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cliente_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cliente_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT uk_cliente_usuario_salon UNIQUE (usuario_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_usuario ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cliente_salon ON clientes(salon_id);
CREATE INDEX IF NOT EXISTS idx_cliente_ativo ON clientes(ativo);

COMMENT ON TABLE clientes IS 'Clients associated with specific salons';

-- Appointments table
CREATE TABLE IF NOT EXISTS agendamentos (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL,
    cliente_id BIGINT NOT NULL,
    profissional_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    fim_previsto TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    observacoes VARCHAR(500),
    motivo_cancelamento VARCHAR(300),
    valor_cobrado DECIMAL(10,2),
    token_confirmacao VARCHAR(100) UNIQUE,
    lembrete_enviado24h BOOLEAN NOT NULL DEFAULT FALSE,
    lembrete_enviado2h BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_agendamento_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT fk_agendamento_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
    CONSTRAINT chk_agendamento_status CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'NO_SHOW')),
    CONSTRAINT chk_agendamento_datas CHECK (fim_previsto > data_hora)
);

CREATE INDEX IF NOT EXISTS idx_agendamento_salon ON agendamentos(salon_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_profissional ON agendamentos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_servico ON agendamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamento_data_hora ON agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamento_token ON agendamentos(token_confirmacao);

COMMENT ON TABLE agendamentos IS 'Appointments linking clients, professionals, and services';
COMMENT ON COLUMN agendamentos.status IS 'PENDENTE, CONFIRMADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO, NO_SHOW';

-- Reviews table
CREATE TABLE IF NOT EXISTS avaliacoes (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL UNIQUE,
    profissional_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    nota INT NOT NULL,
    comentario VARCHAR(1000),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_avaliacao_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT chk_avaliacao_nota CHECK (nota >= 1 AND nota <= 5)
);

CREATE INDEX IF NOT EXISTS idx_avaliacao_agendamento ON avaliacoes(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_profissional ON avaliacoes(profissional_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_salon ON avaliacoes(salon_id);

COMMENT ON TABLE avaliacoes IS 'Ratings and reviews for completed appointments';
