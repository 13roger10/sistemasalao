-- Colunas mapeadas nas entidades que nenhuma migration criava. Em dev/local o Hibernate
-- (ddl-auto: update) as criava sozinho; em produção (validate) o backend não subia e no Docker
-- (none) as consultas falhavam. IF NOT EXISTS: bancos já alterados pelo Hibernate passam direto.

-- Agendamento.notasInternas: nota da equipe, nunca exposta ao cliente
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS notas_internas VARCHAR(500);

-- Usuario.salon: salão da RECEPCIONISTA (unidade em uso; as demais ficam em recepcionista_unidades)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salon_id BIGINT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuario_salon') THEN
        ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_salon
            FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_usuario_salon ON usuarios (salon_id);
