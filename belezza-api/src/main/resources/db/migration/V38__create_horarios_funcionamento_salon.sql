-- Belezza API - Migration V38
-- Create per-day salon operating hours table
-- This is the admin's master configuration for which days/hours the salon is open

CREATE TABLE IF NOT EXISTS horarios_funcionamento_salon (
    id            BIGSERIAL    PRIMARY KEY,
    salon_id      BIGINT       NOT NULL,
    dia_semana    VARCHAR(10)  NOT NULL,
    hora_inicio   TIME,
    hora_fim      TIME,
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hfs_salon    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT uk_hfs_salon_dia UNIQUE (salon_id, dia_semana)
);

-- Seed from existing salons using their current operating hours
-- Monday - Friday: salon opening/closing hours, open
INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'SEGUNDA', horario_abertura, horario_fechamento, TRUE FROM salons WHERE ativo = TRUE;

INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'TERCA', horario_abertura, horario_fechamento, TRUE FROM salons WHERE ativo = TRUE;

INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'QUARTA', horario_abertura, horario_fechamento, TRUE FROM salons WHERE ativo = TRUE;

INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'QUINTA', horario_abertura, horario_fechamento, TRUE FROM salons WHERE ativo = TRUE;

INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'SEXTA', horario_abertura, horario_fechamento, TRUE FROM salons WHERE ativo = TRUE;

-- Saturday: close at 18:00
INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'SABADO', horario_abertura, TIME '18:00', TRUE FROM salons WHERE ativo = TRUE;

-- Sunday: closed
INSERT INTO horarios_funcionamento_salon (salon_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT id, 'DOMINGO', NULL, NULL, FALSE FROM salons WHERE ativo = TRUE;

-- Add scheduling config columns to salons table
ALTER TABLE salons ADD COLUMN IF NOT EXISTS buffer_entre_agendamentos_minutos INT NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS max_antecedia_dias INT NOT NULL DEFAULT 30;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS permite_agendamento_mesmo_dia BOOLEAN NOT NULL DEFAULT TRUE;
