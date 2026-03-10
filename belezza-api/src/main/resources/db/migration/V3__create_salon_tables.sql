-- Belezza API - Migration V3
-- Create salon and professional tables

-- Salons table
CREATE TABLE IF NOT EXISTS salons (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(500),
    endereco VARCHAR(300),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    cnpj VARCHAR(20),
    horario_abertura TIME NOT NULL DEFAULT '08:00',
    horario_fechamento TIME NOT NULL DEFAULT '20:00',
    intervalo_agendamento_minutos INT NOT NULL DEFAULT 30,
    antecedencia_minima_horas INT NOT NULL DEFAULT 2,
    cancelamento_minimo_horas INT NOT NULL DEFAULT 2,
    max_no_shows_permitidos INT NOT NULL DEFAULT 3,
    aceita_agendamento_online BOOLEAN NOT NULL DEFAULT TRUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    admin_id BIGINT NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_salon_admin FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_salon_admin ON salons(admin_id);
CREATE INDEX IF NOT EXISTS idx_salon_ativo ON salons(ativo);
CREATE INDEX IF NOT EXISTS idx_salon_cidade ON salons(cidade);

COMMENT ON TABLE salons IS 'Beauty salons registered in the system';

-- Services table
CREATE TABLE IF NOT EXISTS servicos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(500),
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    salon_id BIGINT NOT NULL,
    imagem_url VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_servico_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT chk_servico_tipo CHECK (tipo IN ('CABELO', 'UNHA', 'MAQUIAGEM', 'ESTETICA', 'DEPILACAO', 'BARBA', 'SOBRANCELHA', 'MASSAGEM', 'OUTRO')),
    CONSTRAINT chk_servico_preco CHECK (preco >= 0),
    CONSTRAINT chk_servico_duracao CHECK (duracao_minutos > 0)
);

CREATE INDEX IF NOT EXISTS idx_servico_salon ON servicos(salon_id);
CREATE INDEX IF NOT EXISTS idx_servico_tipo ON servicos(tipo);
CREATE INDEX IF NOT EXISTS idx_servico_ativo ON servicos(ativo);

COMMENT ON TABLE servicos IS 'Services offered by salons (haircut, manicure, etc.)';

-- Professionals table
CREATE TABLE IF NOT EXISTS profissionais (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE,
    salon_id BIGINT NOT NULL,
    especialidade VARCHAR(300),
    bio VARCHAR(500),
    foto_url VARCHAR(500),
    aceita_agendamento_online BOOLEAN NOT NULL DEFAULT TRUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_profissional_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_profissional_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profissional_salon ON profissionais(salon_id);
CREATE INDEX IF NOT EXISTS idx_profissional_usuario ON profissionais(usuario_id);
CREATE INDEX IF NOT EXISTS idx_profissional_ativo ON profissionais(ativo);

COMMENT ON TABLE profissionais IS 'Professionals working at salons';

-- Professional-Service relationship (many-to-many)
CREATE TABLE IF NOT EXISTS profissional_servicos (
    profissional_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    PRIMARY KEY (profissional_id, servico_id),

    CONSTRAINT fk_ps_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
);

-- Work schedules
CREATE TABLE IF NOT EXISTS horarios_trabalho (
    id BIGSERIAL PRIMARY KEY,
    profissional_id BIGINT NOT NULL,
    dia_semana VARCHAR(10) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    intervalo_inicio TIME NOT NULL,
    intervalo_fim TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_horario_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    CONSTRAINT uk_horario_profissional_dia UNIQUE (profissional_id, dia_semana),
    CONSTRAINT chk_horario_dia_semana CHECK (dia_semana IN ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO'))
);

CREATE INDEX IF NOT EXISTS idx_horario_profissional ON horarios_trabalho(profissional_id);

COMMENT ON TABLE horarios_trabalho IS 'Work schedules for professionals';

-- Time blocks (vacation, day off)
CREATE TABLE IF NOT EXISTS bloqueios_horario (
    id BIGSERIAL PRIMARY KEY,
    profissional_id BIGINT NOT NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP NOT NULL,
    motivo VARCHAR(200),
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bloqueio_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    CONSTRAINT chk_bloqueio_datas CHECK (data_fim > data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_bloqueio_profissional ON bloqueios_horario(profissional_id);
CREATE INDEX IF NOT EXISTS idx_bloqueio_datas ON bloqueios_horario(data_inicio, data_fim);

COMMENT ON TABLE bloqueios_horario IS 'Time blocks for professionals (vacation, day off)';
