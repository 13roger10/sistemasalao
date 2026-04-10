-- Belezza API - Migration V27
-- Update ALL work schedules to standard salon operating hours (09:00-19:00)
-- This fixes the issue where booking page shows limited hours

-- =============================================
-- Update ALL work schedules to 09:00-19:00 for weekdays
-- =============================================
UPDATE horarios_trabalho
SET hora_inicio = TIME '09:00',
    hora_fim = TIME '19:00'
WHERE dia_semana IN ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA')
  AND ativo = TRUE;

-- =============================================
-- Update Saturday schedules to 09:00-17:00
-- =============================================
UPDATE horarios_trabalho
SET hora_inicio = TIME '09:00',
    hora_fim = TIME '17:00'
WHERE dia_semana = 'SABADO'
  AND ativo = TRUE;
