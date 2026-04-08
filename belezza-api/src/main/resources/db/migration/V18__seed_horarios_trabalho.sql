-- Belezza API - Migration V18
-- Seed work schedules (horarios_trabalho) for professionals
-- This is required for the availability system to work

-- =============================================
-- Work schedules for Carlos (Professional 1)
-- Works Monday to Saturday, 09:00-18:00, lunch 12:00-13:00
-- =============================================

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEGUNDA', '09:00', '18:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SEGUNDA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'TERCA', '09:00', '18:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'TERCA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUARTA', '09:00', '18:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUARTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUINTA', '09:00', '18:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUINTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEXTA', '09:00', '18:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SEXTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SABADO', '09:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'carlos@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SABADO');

-- =============================================
-- Work schedules for Ana (Professional 2)
-- Works Monday to Friday, 08:00-17:00, lunch 12:00-13:00
-- =============================================

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEGUNDA', '08:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SEGUNDA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'TERCA', '08:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'TERCA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUARTA', '08:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUARTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUINTA', '08:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUINTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEXTA', '08:00', '17:00', '12:00', '13:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SEXTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SABADO', '09:00', '14:00', '12:00', '12:30', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'ana@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SABADO');

-- =============================================
-- Work schedules for Roberto (Professional 3)
-- Works Tuesday to Saturday, 10:00-19:00, lunch 13:00-14:00
-- =============================================

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'TERCA', '10:00', '19:00', '13:00', '14:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'roberto@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'TERCA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUARTA', '10:00', '19:00', '13:00', '14:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'roberto@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUARTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'QUINTA', '10:00', '19:00', '13:00', '14:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'roberto@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'QUINTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SEXTA', '10:00', '19:00', '13:00', '14:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'roberto@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SEXTA');

INSERT INTO horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, ativo)
SELECT p.id, 'SABADO', '10:00', '18:00', '13:00', '14:00', TRUE
FROM profissionais p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email = 'roberto@belezza.ai'
AND NOT EXISTS (SELECT 1 FROM horarios_trabalho h WHERE h.profissional_id = p.id AND h.dia_semana = 'SABADO');
