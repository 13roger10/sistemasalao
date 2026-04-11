-- Belezza API - Migration V31
-- Update salon and work schedules to 09:00-20:00 operating hours
-- Weekdays: 09:00-20:00, Saturday: 09:00-18:00

-- =============================================
-- Update salon closing time to 20:00
-- =============================================
UPDATE salons
SET horario_fechamento = TIME '20:00'
WHERE horario_fechamento = TIME '19:00';

-- =============================================
-- Update ALL weekday work schedules to 09:00-20:00
-- =============================================
UPDATE horarios_trabalho
SET hora_inicio = TIME '09:00',
    hora_fim = TIME '20:00'
WHERE dia_semana IN ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA')
  AND ativo = TRUE;

-- =============================================
-- Update Saturday schedules to 09:00-18:00
-- =============================================
UPDATE horarios_trabalho
SET hora_inicio = TIME '09:00',
    hora_fim = TIME '18:00'
WHERE dia_semana = 'SABADO'
  AND ativo = TRUE;
