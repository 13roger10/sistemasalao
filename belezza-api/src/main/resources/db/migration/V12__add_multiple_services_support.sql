-- V12: Add support for multiple services per appointment
-- Date: 2026-02-09
-- Description: Creates agendamento_servicos table to support multiple services in a single appointment

-- Create agendamento_servicos table
CREATE TABLE agendamento_servicos (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    ordem INT NOT NULL,
    duracao_prevista_minutos INT NOT NULL,
    tempo_preparacao_minutos INT DEFAULT 0,

    -- Foreign keys
    CONSTRAINT fk_agendamento_servico_agendamento FOREIGN KEY (agendamento_id)
        REFERENCES agendamentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_agendamento_servico_servico FOREIGN KEY (servico_id)
        REFERENCES servicos(id) ON DELETE RESTRICT,

    -- Unique constraint: each appointment can have only one service at each order position
    CONSTRAINT uk_agendamento_servico_ordem UNIQUE (agendamento_id, ordem),

    -- Business constraints
    CONSTRAINT ck_agendamento_servico_ordem_positiva CHECK (ordem > 0),
    CONSTRAINT ck_agendamento_servico_duracao_positiva CHECK (duracao_prevista_minutos > 0),
    CONSTRAINT ck_agendamento_servico_preparacao_nao_negativa CHECK (tempo_preparacao_minutos >= 0)
);

-- Indexes for performance
CREATE INDEX idx_agendamento_servico_agendamento ON agendamento_servicos(agendamento_id);
CREATE INDEX idx_agendamento_servico_servico ON agendamento_servicos(servico_id);
CREATE INDEX idx_agendamento_servico_ordem ON agendamento_servicos(agendamento_id, ordem);

-- Make servico_id nullable in agendamentos table for backward compatibility
-- New appointments will use agendamento_servicos table
-- Legacy appointments can still use the servico_id column
ALTER TABLE agendamentos ALTER COLUMN servico_id DROP NOT NULL;

-- Add comment to servico_id column to indicate it's deprecated
COMMENT ON COLUMN agendamentos.servico_id IS 'DEPRECATED: Single service field for backward compatibility. Use agendamento_servicos table for new appointments.';

-- Add table comments
COMMENT ON TABLE agendamento_servicos IS 'Association table for appointments with multiple services. Supports sequential service scheduling.';
COMMENT ON COLUMN agendamento_servicos.ordem IS 'Order of service execution (1, 2, 3, ...). Services are executed sequentially in this order.';
COMMENT ON COLUMN agendamento_servicos.duracao_prevista_minutos IS 'Planned duration for this specific service. Can override service default duration.';
COMMENT ON COLUMN agendamento_servicos.tempo_preparacao_minutos IS 'Preparation time before this service starts (cleanup, setup, breaks).';
