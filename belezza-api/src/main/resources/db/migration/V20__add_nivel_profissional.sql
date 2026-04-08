-- Add nivel and especializacoes columns to profissionais table
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS nivel VARCHAR(20);
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS especializacoes VARCHAR(200);

-- Create index for nivel
CREATE INDEX IF NOT EXISTS idx_profissional_nivel ON profissionais(nivel);

-- Update existing professionals with default level based on experience (placeholder)
UPDATE profissionais SET nivel = 'PLENO' WHERE nivel IS NULL AND ativo = true;

-- Comments
COMMENT ON COLUMN profissionais.nivel IS 'Nível de experiência: JUNIOR, PLENO, SENIOR, ESPECIALISTA, MASTER';
COMMENT ON COLUMN profissionais.especializacoes IS 'Lista de especializações adicionais separadas por vírgula';
