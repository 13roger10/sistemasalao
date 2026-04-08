-- Belezza API - Migration V2
-- Seed admin user for testing
-- Password: Admin@123 (BCrypt encoded with cost 12)
-- Using MERGE for H2/PostgreSQL compatibility

MERGE INTO usuarios AS u
USING (SELECT 'admin@belezza.ai' AS email) AS src
ON u.email = src.email
WHEN NOT MATCHED THEN
INSERT (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
VALUES (
    'admin@belezza.ai',
    '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C',
    'Administrador Belezza',
    '+5511999999999',
    'ADMIN',
    'PREMIUM',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
