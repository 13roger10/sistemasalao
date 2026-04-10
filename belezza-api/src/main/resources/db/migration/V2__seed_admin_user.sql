-- Belezza API - Migration V2
-- Seed admin user for testing
-- Password: Admin@123 (BCrypt encoded)

INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'admin@belezza.ai',
       '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C',
       'Administrador Belezza',
       '+5511999999999',
       'ADMIN',
       'PREMIUM',
       TRUE,
       TRUE,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@belezza.ai');
