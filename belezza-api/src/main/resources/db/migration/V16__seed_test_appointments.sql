-- Belezza API - Migration V16
-- Seed test data: professionals, clients, and appointments for development
-- Password for all test users: Admin@123 (BCrypt encoded with cost 12)

-- =============================================
-- 1. Create test users for professionals
-- =============================================

-- Professional user 1: Carlos (Barbeiro)
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'carlos@belezza.ai', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Carlos Silva', '+5511988881111', 'PROFISSIONAL', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'carlos@belezza.ai');

-- Professional user 2: Ana (Cabeleireira)
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'ana@belezza.ai', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Ana Costa', '+5511988882222', 'PROFISSIONAL', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'ana@belezza.ai');

-- Professional user 3: Roberto (Manicure/Pedicure)
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'roberto@belezza.ai', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Roberto Santos', '+5511988883333', 'PROFISSIONAL', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'roberto@belezza.ai');

-- =============================================
-- 2. Create test users for clients
-- =============================================

-- Client user 1: Joao
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'joao@cliente.com', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Joao Oliveira', '+5511999991111', 'CLIENTE', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'joao@cliente.com');

-- Client user 2: Maria
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'maria@cliente.com', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Maria Fernandes', '+5511999992222', 'CLIENTE', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'maria@cliente.com');

-- Client user 3: Pedro
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'pedro@cliente.com', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Pedro Almeida', '+5511999993333', 'CLIENTE', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'pedro@cliente.com');

-- Client user 4: Fernanda
INSERT INTO usuarios (email, password, nome, telefone, role, plano, ativo, email_verificado, criado_em, atualizado_em)
SELECT 'fernanda@cliente.com', '$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C', 'Fernanda Lima', '+5511999994444', 'CLIENTE', 'FREE', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'fernanda@cliente.com');

-- =============================================
-- 3. Create professionals linked to salon
-- =============================================

-- Professional 1: Carlos
INSERT INTO profissionais (usuario_id, salon_id, especialidade, bio, ativo, aceita_agendamento_online, criado_em, atualizado_em)
SELECT u.id, s.id, 'Corte Masculino, Barba', 'Especialista em cortes masculinos e barba com 10 anos de experiencia', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'carlos@belezza.ai' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM profissionais p WHERE p.usuario_id = u.id);

-- Professional 2: Ana
INSERT INTO profissionais (usuario_id, salon_id, especialidade, bio, ativo, aceita_agendamento_online, criado_em, atualizado_em)
SELECT u.id, s.id, 'Corte Feminino, Coloracao', 'Cabeleireira especializada em cortes femininos e coloracao', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'ana@belezza.ai' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM profissionais p WHERE p.usuario_id = u.id);

-- Professional 3: Roberto
INSERT INTO profissionais (usuario_id, salon_id, especialidade, bio, ativo, aceita_agendamento_online, criado_em, atualizado_em)
SELECT u.id, s.id, 'Manicure, Pedicure', 'Especialista em unhas e tratamentos esteticos', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'roberto@belezza.ai' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM profissionais p WHERE p.usuario_id = u.id);

-- =============================================
-- 4. Create clients linked to salon
-- =============================================

-- Client 1: Joao
INSERT INTO clientes (usuario_id, salon_id, data_nascimento, ativo, aceita_marketing, aceita_whatsapp, aceita_email, total_agendamentos, total_gasto, no_shows, bloqueado, criado_em, atualizado_em)
SELECT u.id, s.id, DATE '1990-05-15', TRUE, TRUE, TRUE, TRUE, 5, 250.00, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'joao@cliente.com' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.usuario_id = u.id AND c.salon_id = s.id);

-- Client 2: Maria
INSERT INTO clientes (usuario_id, salon_id, data_nascimento, ativo, aceita_marketing, aceita_whatsapp, aceita_email, total_agendamentos, total_gasto, no_shows, bloqueado, criado_em, atualizado_em)
SELECT u.id, s.id, DATE '1985-08-20', TRUE, TRUE, TRUE, FALSE, 10, 800.00, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'maria@cliente.com' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.usuario_id = u.id AND c.salon_id = s.id);

-- Client 3: Pedro
INSERT INTO clientes (usuario_id, salon_id, data_nascimento, ativo, aceita_marketing, aceita_whatsapp, aceita_email, total_agendamentos, total_gasto, no_shows, bloqueado, criado_em, atualizado_em)
SELECT u.id, s.id, DATE '1992-03-10', TRUE, FALSE, TRUE, TRUE, 3, 135.00, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'pedro@cliente.com' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.usuario_id = u.id AND c.salon_id = s.id);

-- Client 4: Fernanda
INSERT INTO clientes (usuario_id, salon_id, data_nascimento, ativo, aceita_marketing, aceita_whatsapp, aceita_email, total_agendamentos, total_gasto, no_shows, bloqueado, criado_em, atualizado_em)
SELECT u.id, s.id, DATE '1988-11-25', TRUE, TRUE, TRUE, TRUE, 8, 640.00, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u, salons s
WHERE u.email = 'fernanda@cliente.com' AND s.nome = 'Belezza Studio Demo'
AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.usuario_id = u.id AND c.salon_id = s.id);

-- =============================================
-- 5. Create test appointments for TODAY
-- =============================================

-- Appointment 1: Joao with Carlos - Corte Masculino - Today 09:00 (CONFIRMADO)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '09:00:00',
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '09:30:00',
       'CONFIRMADO', 45.00, 'token-test-001', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'joao@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'carlos@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Masculino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-001');

-- Appointment 2: Maria with Ana - Corte Feminino - Today 10:00 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '10:00:00',
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '11:00:00',
       'PENDENTE', 80.00, 'token-test-002', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'maria@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'ana@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Feminino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-002');

-- Appointment 3: Pedro with Carlos - Corte Masculino - Today 11:00 (CONFIRMADO)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '11:00:00',
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '11:30:00',
       'CONFIRMADO', 45.00, 'token-test-003', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'pedro@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'carlos@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Masculino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-003');

-- Appointment 4: Fernanda with Roberto - Manicure - Today 14:00 (CONFIRMADO)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '14:00:00',
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '14:45:00',
       'CONFIRMADO', 35.00, 'token-test-004', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'fernanda@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'roberto@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Manicure' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-004');

-- Appointment 5: Maria with Ana - Coloracao - Today 15:00 (EM_ANDAMENTO)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '15:00:00',
       CAST(CURRENT_DATE AS TIMESTAMP) + TIME '17:00:00',
       'EM_ANDAMENTO', 150.00, 'token-test-005', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'maria@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'ana@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Coloracao' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-005');

-- =============================================
-- 6. Create test appointments for TOMORROW
-- =============================================

-- Appointment 6: Joao with Carlos - Today+1 09:30 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '09:30:00',
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '10:00:00',
       'PENDENTE', 45.00, 'token-test-006', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'joao@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'carlos@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Masculino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-006');

-- Appointment 7: Fernanda with Ana - Corte Feminino - Today+1 11:00 (CONFIRMADO)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '11:00:00',
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '12:00:00',
       'CONFIRMADO', 80.00, 'token-test-007', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'fernanda@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'ana@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Feminino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-007');

-- Appointment 8: Pedro with Roberto - Pedicure - Today+1 14:30 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '14:30:00',
       CAST(CURRENT_DATE + 1 AS TIMESTAMP) + TIME '15:20:00',
       'PENDENTE', 40.00, 'token-test-008', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'pedro@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'roberto@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Pedicure' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-008');

-- =============================================
-- 7. Create test appointments for NEXT DAYS
-- =============================================

-- Appointment 9: Maria with Carlos - Today+2 10:00 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 2 AS TIMESTAMP) + TIME '10:00:00',
       CAST(CURRENT_DATE + 2 AS TIMESTAMP) + TIME '10:30:00',
       'PENDENTE', 45.00, 'token-test-009', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'maria@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'carlos@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Masculino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-009');

-- Appointment 10: Joao with Roberto - Manicure - Today+3 15:00 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 3 AS TIMESTAMP) + TIME '15:00:00',
       CAST(CURRENT_DATE + 3 AS TIMESTAMP) + TIME '15:45:00',
       'PENDENTE', 35.00, 'token-test-010', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'joao@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'roberto@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Manicure' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-010');

-- Appointment 11: Fernanda with Ana - Coloracao - Today+5 09:00 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 5 AS TIMESTAMP) + TIME '09:00:00',
       CAST(CURRENT_DATE + 5 AS TIMESTAMP) + TIME '11:00:00',
       'PENDENTE', 150.00, 'token-test-011', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'fernanda@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'ana@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Coloracao' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-011');

-- Appointment 12: Pedro with Carlos - Today+7 16:00 (PENDENTE)
INSERT INTO agendamentos (salon_id, cliente_id, profissional_id, servico_id, data_hora, fim_previsto, status, valor_cobrado, token_confirmacao, lembrete_enviado24h, lembrete_enviado2h, criado_em, atualizado_em)
SELECT s.id, c.id, p.id, sv.id,
       CAST(CURRENT_DATE + 7 AS TIMESTAMP) + TIME '16:00:00',
       CAST(CURRENT_DATE + 7 AS TIMESTAMP) + TIME '16:30:00',
       'PENDENTE', 45.00, 'token-test-012', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons s, clientes c, profissionais p, servicos sv, usuarios uc, usuarios up
WHERE s.nome = 'Belezza Studio Demo'
  AND c.usuario_id = uc.id AND uc.email = 'pedro@cliente.com' AND c.salon_id = s.id
  AND p.usuario_id = up.id AND up.email = 'carlos@belezza.ai' AND p.salon_id = s.id
  AND sv.nome = 'Corte Masculino' AND sv.salon_id = s.id
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.token_confirmacao = 'token-test-012');
