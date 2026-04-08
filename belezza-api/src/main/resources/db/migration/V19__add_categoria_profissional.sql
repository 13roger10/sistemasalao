-- Add categoria column to profissionais table
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS categoria VARCHAR(30);

-- Create index for categoria
CREATE INDEX IF NOT EXISTS idx_profissional_categoria ON profissionais(categoria);

-- Update existing professionals with default categories based on especialidade
UPDATE profissionais SET categoria = 'CABELEIREIRO' WHERE especialidade ILIKE '%cabeleir%' OR especialidade ILIKE '%corte%';
UPDATE profissionais SET categoria = 'COLORISTA' WHERE especialidade ILIKE '%colorist%' OR especialidade ILIKE '%coloração%';
UPDATE profissionais SET categoria = 'MANICURE_PEDICURE' WHERE especialidade ILIKE '%manicure%' OR especialidade ILIKE '%pedicure%' OR especialidade ILIKE '%unha%';
UPDATE profissionais SET categoria = 'MAQUIADOR' WHERE especialidade ILIKE '%maquiador%' OR especialidade ILIKE '%maquiagem%';
UPDATE profissionais SET categoria = 'ESTETICISTA' WHERE especialidade ILIKE '%esteticista%' OR especialidade ILIKE '%estética%';
UPDATE profissionais SET categoria = 'BARBEIRO' WHERE especialidade ILIKE '%barbeir%' OR especialidade ILIKE '%barba%';
UPDATE profissionais SET categoria = 'DESIGNER_SOBRANCELHAS' WHERE especialidade ILIKE '%sobrancelha%';
UPDATE profissionais SET categoria = 'LASH_DESIGNER' WHERE especialidade ILIKE '%cílios%' OR especialidade ILIKE '%lash%';
UPDATE profissionais SET categoria = 'NAIL_DESIGNER' WHERE especialidade ILIKE '%nail%' OR especialidade ILIKE '%alongamento%';
UPDATE profissionais SET categoria = 'AUXILIAR' WHERE especialidade ILIKE '%auxiliar%';
UPDATE profissionais SET categoria = 'RECEPCIONISTA' WHERE especialidade ILIKE '%recepcion%';
UPDATE profissionais SET categoria = 'GERENTE' WHERE especialidade ILIKE '%gerente%';

-- Set default for remaining NULL values
UPDATE profissionais SET categoria = 'OUTRO' WHERE categoria IS NULL;
