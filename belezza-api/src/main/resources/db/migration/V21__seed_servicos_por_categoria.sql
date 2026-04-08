-- =============================================
-- V21: Seed de Serviços por Categoria de Profissional
-- Serviços padrão para cada tipo de profissional
-- =============================================

-- Nota: Estes serviços serão vinculados ao salon_id = 1 (salão padrão)
-- Em produção, cada salão deve cadastrar seus próprios serviços

-- =============================================
-- CABELEIREIRO - Serviços de Cabelo
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Corte Feminino', 'Corte de cabelo feminino com lavagem e finalização', 80.00, 60, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte Feminino' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Corte Masculino', 'Corte de cabelo masculino com lavagem', 50.00, 30, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte Masculino' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Escova Simples', 'Escova lisa com secador', 60.00, 45, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Escova Simples' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Escova Progressiva', 'Tratamento progressivo para alisar os fios', 250.00, 180, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Escova Progressiva' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Hidratação Capilar', 'Tratamento de hidratação profunda', 80.00, 60, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Hidratação Capilar' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Cauterização', 'Tratamento de reconstrução capilar', 120.00, 90, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Cauterização' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Botox Capilar', 'Tratamento para redução de volume e brilho', 180.00, 120, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Botox Capilar' AND salon_id = 1);

-- =============================================
-- COLORISTA - Serviços de Coloração
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Coloração Completa', 'Aplicação de tintura em todo o cabelo', 150.00, 120, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Coloração Completa' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Retoque de Raiz', 'Coloração apenas na raiz', 80.00, 60, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Retoque de Raiz' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Mechas/Luzes', 'Mechas ou luzes tradicionais', 200.00, 150, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Mechas/Luzes' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Balayage', 'Técnica de mechas esfumadas', 300.00, 180, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Balayage' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Ombré Hair', 'Efeito degradê nas pontas', 280.00, 150, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Ombré Hair' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Descoloração', 'Clareamento total dos fios', 180.00, 120, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Descoloração' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Correção de Cor', 'Correção de coloração mal sucedida', 350.00, 240, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Correção de Cor' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Consultoria de Cor', 'Análise e recomendação de tonalidade ideal', 50.00, 30, 'CABELO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Consultoria de Cor' AND salon_id = 1);

-- =============================================
-- MANICURE/PEDICURE - Serviços de Unhas
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Manicure Simples', 'Cuticulagem e esmaltação das mãos', 35.00, 45, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Manicure Simples' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Pedicure Simples', 'Cuticulagem e esmaltação dos pés', 40.00, 50, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Pedicure Simples' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Manicure + Pedicure', 'Serviço completo mãos e pés', 70.00, 90, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Manicure + Pedicure' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Esmaltação em Gel', 'Aplicação de esmalte em gel com duração prolongada', 60.00, 60, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Esmaltação em Gel' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Spa dos Pés', 'Tratamento completo com esfoliação, hidratação e massagem', 80.00, 60, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Spa dos Pés' AND salon_id = 1);

-- =============================================
-- NAIL DESIGNER - Unhas Artísticas
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Alongamento em Gel', 'Alongamento de unhas com gel moldado', 150.00, 120, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Alongamento em Gel' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Alongamento em Fibra', 'Alongamento com fibra de vidro', 180.00, 150, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Alongamento em Fibra' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Alongamento Acrílico', 'Alongamento com pó acrílico', 200.00, 150, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Alongamento Acrílico' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Manutenção Alongamento', 'Manutenção de alongamento existente', 100.00, 90, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Manutenção Alongamento' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Nail Art Simples', 'Decoração simples nas unhas', 30.00, 30, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Nail Art Simples' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Nail Art Elaborada', 'Decoração artística detalhada', 80.00, 60, 'UNHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Nail Art Elaborada' AND salon_id = 1);

-- =============================================
-- MAQUIADOR(A) - Serviços de Maquiagem
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Maquiagem Social', 'Maquiagem para eventos sociais', 120.00, 60, 'MAQUIAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Maquiagem Social' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Maquiagem para Noiva', 'Maquiagem completa para noivas', 350.00, 90, 'MAQUIAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Maquiagem para Noiva' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Maquiagem para Festa', 'Maquiagem para festas e eventos noturnos', 150.00, 60, 'MAQUIAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Maquiagem para Festa' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Maquiagem Profissional', 'Maquiagem para ensaios e produções', 200.00, 90, 'MAQUIAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Maquiagem Profissional' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Automaquiagem (Aula)', 'Aula de automaquiagem personalizada', 250.00, 120, 'MAQUIAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Automaquiagem (Aula)' AND salon_id = 1);

-- =============================================
-- DESIGNER DE SOBRANCELHAS
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Design de Sobrancelhas', 'Design com pinça e linha', 40.00, 30, 'SOBRANCELHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Design de Sobrancelhas' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Henna nas Sobrancelhas', 'Aplicação de henna para coloração', 50.00, 45, 'SOBRANCELHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Henna nas Sobrancelhas' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Micropigmentação Sobrancelha', 'Micropigmentação fio a fio ou esfumada', 800.00, 180, 'SOBRANCELHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Micropigmentação Sobrancelha' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Retoque Micropigmentação', 'Retoque de micropigmentação existente', 400.00, 120, 'SOBRANCELHA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Retoque Micropigmentação' AND salon_id = 1);

-- =============================================
-- LASH DESIGNER - Cílios
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Extensão de Cílios Clássica', 'Aplicação fio a fio clássica', 180.00, 120, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Extensão de Cílios Clássica' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Extensão de Cílios Volume', 'Aplicação com técnica de volume', 250.00, 150, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Extensão de Cílios Volume' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Manutenção de Cílios', 'Manutenção de extensão existente', 100.00, 60, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Manutenção de Cílios' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Lash Lifting', 'Curvamento permanente dos cílios naturais', 150.00, 90, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Lash Lifting' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Lash Lifting + Tintura', 'Curvamento com coloração dos cílios', 180.00, 105, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Lash Lifting + Tintura' AND salon_id = 1);

-- =============================================
-- ESTETICISTA - Tratamentos Faciais e Corporais
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Limpeza de Pele', 'Limpeza profunda com extração', 120.00, 90, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Limpeza de Pele' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Peeling Facial', 'Tratamento de renovação celular', 150.00, 60, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Peeling Facial' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Hidratação Facial', 'Tratamento de hidratação profunda', 100.00, 60, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Hidratação Facial' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Drenagem Linfática Facial', 'Drenagem para redução de inchaço', 80.00, 45, 'ESTETICA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Drenagem Linfática Facial' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Drenagem Linfática Corporal', 'Drenagem corporal completa', 150.00, 60, 'MASSAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Drenagem Linfática Corporal' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Massagem Relaxante', 'Massagem corporal para relaxamento', 120.00, 60, 'MASSAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Massagem Relaxante' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Massagem Modeladora', 'Massagem para redução de medidas', 140.00, 60, 'MASSAGEM', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Massagem Modeladora' AND salon_id = 1);

-- =============================================
-- BARBEIRO - Serviços Masculinos
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Barba Completa', 'Aparar, desenhar e finalizar a barba', 40.00, 30, 'BARBA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Barba Completa' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Corte + Barba', 'Combo corte masculino com barba', 80.00, 60, 'BARBA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte + Barba' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Barboterapia', 'Tratamento completo com toalha quente', 60.00, 45, 'BARBA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Barboterapia' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Pigmentação de Barba', 'Coloração para cobrir falhas', 80.00, 45, 'BARBA', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Pigmentação de Barba' AND salon_id = 1);

-- =============================================
-- DEPILAÇÃO
-- =============================================
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Depilação Buço', 'Depilação com cera no buço', 15.00, 15, 'DEPILACAO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Depilação Buço' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Depilação Axila', 'Depilação com cera nas axilas', 25.00, 20, 'DEPILACAO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Depilação Axila' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Depilação Meia Perna', 'Depilação com cera meia perna', 40.00, 30, 'DEPILACAO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Depilação Meia Perna' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Depilação Perna Inteira', 'Depilação com cera perna completa', 70.00, 45, 'DEPILACAO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Depilação Perna Inteira' AND salon_id = 1);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos, tipo, salon_id, ativo, criado_em, atualizado_em)
SELECT 'Depilação Virilha Completa', 'Depilação com cera virilha completa', 60.00, 30, 'DEPILACAO', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Depilação Virilha Completa' AND salon_id = 1);

-- Comentário final
COMMENT ON TABLE servicos IS 'Serviços oferecidos pelos salões. Seeds incluem serviços padrão por categoria de profissional.';
