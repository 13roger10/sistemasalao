-- Belezza API - Migration V2
-- Seed admin user for testing
-- Password: Admin@123 (BCrypt encoded with cost 12)

INSERT INTO usuarios (
    email,
    password,
    nome,
    telefone,
    role,
    plano,
    ativo,
    email_verificado,
    criado_em,
    atualizado_em
) VALUES (
    'admin@belezza.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWux/Rq0Kqi',
    'Administrador Belezza',
    '+5511999999999',
    'ADMIN',
    'PREMIUM',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    role = EXCLUDED.role,
    plano = EXCLUDED.plano,
    ativo = EXCLUDED.ativo,
    email_verificado = EXCLUDED.email_verificado,
    atualizado_em = CURRENT_TIMESTAMP;
