-- Belezza API - Migration V1
-- Create usuarios table for authentication

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL,
    plano VARCHAR(20) NOT NULL DEFAULT 'FREE',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    reset_password_token VARCHAR(100),
    reset_password_expires TIMESTAMP,
    email_verification_token VARCHAR(100),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,

    CONSTRAINT chk_usuarios_role CHECK (role IN ('ADMIN', 'PROFISSIONAL', 'CLIENTE')),
    CONSTRAINT chk_usuarios_plano CHECK (plano IN ('FREE', 'PRO', 'PREMIUM'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON usuarios(telefone);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_verification ON usuarios(email_verification_token);

-- Comments
COMMENT ON TABLE usuarios IS 'Table storing all user accounts for the Belezza system';
COMMENT ON COLUMN usuarios.role IS 'User role: ADMIN (salon owner), PROFISSIONAL (employee), CLIENTE (customer)';
COMMENT ON COLUMN usuarios.plano IS 'Subscription plan: FREE, PRO, PREMIUM';
