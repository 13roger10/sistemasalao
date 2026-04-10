-- Alterar colunas para permitir NULL (sintaxe H2)
ALTER TABLE horarios_trabalho ALTER COLUMN intervalo_inicio DROP NOT NULL;
ALTER TABLE horarios_trabalho ALTER COLUMN intervalo_fim DROP NOT NULL;

-- Remove intervalo de almoço de todos os profissionais
-- Isso permite que serviços longos sejam agendados pela manhã sem conflito com o intervalo
UPDATE horarios_trabalho
SET intervalo_inicio = NULL,
    intervalo_fim = NULL;
