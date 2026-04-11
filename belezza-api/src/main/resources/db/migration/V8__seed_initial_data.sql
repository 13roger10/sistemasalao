-- Belezza API - Migration V8
-- Seed initial data for development and testing

-- Create a demo salon for the admin user (H2 compatible)
INSERT INTO salons (
    nome, descricao, endereco, cidade, estado, cep, telefone,
    horario_abertura, horario_fechamento,
    intervalo_agendamento_minutos, antecedencia_minima_horas,
    cancelamento_minimo_horas, max_no_shows_permitidos,
    aceita_agendamento_online, ativo, admin_id,
    criado_em, atualizado_em
)
SELECT
    'Belezza Studio Demo',
    'Salão de beleza demonstrativo para testes',
    'Rua das Flores, 123 - Centro',
    'São Paulo',
    'SP',
    '01001-000',
    '+5511999999999',
    '09:00',
    '20:00',
    30, 0, 2, 3,
    TRUE, TRUE, u.id,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM usuarios u
WHERE u.email = 'admin@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM salons s WHERE s.admin_id = u.id);

-- Seed demo services (H2 compatible)
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Corte Feminino', 'Corte de cabelo feminino com lavagem e secagem', 80.00, 60, 'CABELO', sa.id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons sa WHERE sa.nome = 'Belezza Studio Demo' AND NOT EXISTS (SELECT 1 FROM servicos sv WHERE sv.salon_id = sa.id AND sv.nome = 'Corte Feminino');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Corte Masculino', 'Corte de cabelo masculino', 45.00, 30, 'CABELO', sa.id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons sa WHERE sa.nome = 'Belezza Studio Demo' AND NOT EXISTS (SELECT 1 FROM servicos sv WHERE sv.salon_id = sa.id AND sv.nome = 'Corte Masculino');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Coloração', 'Coloração completa com produtos de qualidade', 150.00, 120, 'CABELO', sa.id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons sa WHERE sa.nome = 'Belezza Studio Demo' AND NOT EXISTS (SELECT 1 FROM servicos sv WHERE sv.salon_id = sa.id AND sv.nome = 'Coloração');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Manicure', 'Manicure completa com esmaltação', 35.00, 45, 'UNHA', sa.id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons sa WHERE sa.nome = 'Belezza Studio Demo' AND NOT EXISTS (SELECT 1 FROM servicos sv WHERE sv.salon_id = sa.id AND sv.nome = 'Manicure');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Pedicure', 'Pedicure completa com esmaltação', 40.00, 50, 'UNHA', sa.id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM salons sa WHERE sa.nome = 'Belezza Studio Demo' AND NOT EXISTS (SELECT 1 FROM servicos sv WHERE sv.salon_id = sa.id AND sv.nome = 'Pedicure');
