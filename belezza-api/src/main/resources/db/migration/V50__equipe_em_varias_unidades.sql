-- Equipe em várias unidades do mesmo dono (mesmo padrão do cliente: um cadastro por unidade).
-- Profissional: um cadastro de profissional por unidade — V3 criou profissionais.usuario_id UNIQUE.
ALTER TABLE profissionais DROP CONSTRAINT IF EXISTS profissionais_usuario_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_profissional_usuario_salon ON profissionais(usuario_id, salon_id);

-- Recepcionista: unidades em que pode trabalhar; a unidade em uso continua em usuarios.salon_id.
CREATE TABLE IF NOT EXISTS recepcionista_unidades (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recep_unidade_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_recep_unidade_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT uk_recep_unidade UNIQUE (usuario_id, salon_id)
);
CREATE INDEX IF NOT EXISTS idx_recep_unidade_usuario ON recepcionista_unidades(usuario_id);
