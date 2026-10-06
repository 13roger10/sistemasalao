-- Colunas que as entidades já usam, mas que nenhuma migração criava. Em produção
-- (ddl-auto: validate) o backend não subia: "missing column [notas_internas] in table [agendamentos]".
-- No ambiente local o Hibernate cria as colunas sozinho, por isso o erro só aparecia no PostgreSQL.

-- Salão da recepcionista (isolamento de usuários por salão, BUG-003)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salon_id BIGINT REFERENCES salons(id);
CREATE INDEX IF NOT EXISTS idx_usuarios_salon_id ON usuarios(salon_id);

-- Notas internas da equipe, nunca exibidas ao cliente
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS notas_internas VARCHAR(500);

-- Fotos de referência da ficha de coloração (URLs)
ALTER TABLE fichas_coloracao ADD COLUMN IF NOT EXISTS foto_referencia1 VARCHAR(500);
ALTER TABLE fichas_coloracao ADD COLUMN IF NOT EXISTS foto_referencia2 VARCHAR(500);
ALTER TABLE fichas_coloracao ADD COLUMN IF NOT EXISTS foto_referencia3 VARCHAR(500);
