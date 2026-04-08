-- Belezza API - Migration V17
-- Seed professional-service relationships for booking flow
-- Links professionals to services based on their category/specialty

-- =============================================
-- Carlos (Barbeiro) - All BARBA and CABELO Masculino services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'carlos@belezza.ai'
  AND sv.tipo = 'BARBA'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'carlos@belezza.ai'
  AND sv.nome = 'Corte Masculino'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Ana (Cabeleireira/Colorista) - All CABELO services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'ana@belezza.ai'
  AND sv.tipo = 'CABELO'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Roberto (Manicure/Pedicure) - All UNHA services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'roberto@belezza.ai'
  AND sv.tipo = 'UNHA'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Ana also does MAQUIAGEM services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'ana@belezza.ai'
  AND sv.tipo = 'MAQUIAGEM'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Ana also does SOBRANCELHA services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'ana@belezza.ai'
  AND sv.tipo = 'SOBRANCELHA'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Roberto also does DEPILACAO services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'roberto@belezza.ai'
  AND sv.tipo = 'DEPILACAO'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Ana does ESTETICA services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'ana@belezza.ai'
  AND sv.tipo = 'ESTETICA'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );

-- =============================================
-- Roberto does MASSAGEM services
-- =============================================
INSERT INTO profissional_servicos (profissional_id, servico_id)
SELECT p.id, sv.id
FROM profissionais p, servicos sv, usuarios u
WHERE p.usuario_id = u.id
  AND u.email = 'roberto@belezza.ai'
  AND sv.tipo = 'MASSAGEM'
  AND NOT EXISTS (
    SELECT 1 FROM profissional_servicos ps
    WHERE ps.profissional_id = p.id AND ps.servico_id = sv.id
  );
