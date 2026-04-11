-- Belezza API - Migration V28
-- Ensure all active professionals have work schedules
-- This fixes professionals created via application that don't have schedules

-- Get salon opening hours (default 09:00-20:00 if not set)
-- Create work schedules for professionals who don't have any

-- =============================================
-- Create work schedules for Monday (SEGUNDA)
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEGUNDA',
       COALESCE(s.horario_abertura, TIME '09:00'),
       COALESCE(s.horario_fechamento, TIME '20:00'),
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'SEGUNDA'
  );

-- =============================================
-- Create work schedules for Tuesday (TERCA)
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'TERCA',
       COALESCE(s.horario_abertura, TIME '09:00'),
       COALESCE(s.horario_fechamento, TIME '20:00'),
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'TERCA'
  );

-- =============================================
-- Create work schedules for Wednesday (QUARTA)
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUARTA',
       COALESCE(s.horario_abertura, TIME '09:00'),
       COALESCE(s.horario_fechamento, TIME '20:00'),
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'QUARTA'
  );

-- =============================================
-- Create work schedules for Thursday (QUINTA)
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUINTA',
       COALESCE(s.horario_abertura, TIME '09:00'),
       COALESCE(s.horario_fechamento, TIME '20:00'),
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'QUINTA'
  );

-- =============================================
-- Create work schedules for Friday (SEXTA)
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEXTA',
       COALESCE(s.horario_abertura, TIME '09:00'),
       COALESCE(s.horario_fechamento, TIME '20:00'),
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'SEXTA'
  );

-- =============================================
-- Create work schedules for Saturday (SABADO)
-- Saturday closes earlier at 18:00
-- =============================================
INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SABADO',
       COALESCE(s.horario_abertura, TIME '09:00'),
       TIME '18:00',
       TIME '12:00', TIME '13:00', TRUE
FROM profissionais p
JOIN salons s ON p.salon_id = s.id
WHERE p.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM horarios_trabalho h
    WHERE h.profissional_id = p.id AND h.dia_semana = 'SABADO'
  );
