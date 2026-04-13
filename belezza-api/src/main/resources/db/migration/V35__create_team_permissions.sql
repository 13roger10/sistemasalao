-- Belezza API - Migration V35
-- Item 6: Team Permissions for Social Studio
--
-- Adds per-salon role system for the social studio feature.
-- A user can have a different FuncaoStudio in each salon they belong to.
-- System-level ROLE_ADMIN always bypasses these checks.

CREATE TABLE IF NOT EXISTS membros_studio (
    id            BIGSERIAL PRIMARY KEY,
    salon_id      BIGINT      NOT NULL,
    usuario_id    BIGINT      NOT NULL,
    funcao        VARCHAR(20) NOT NULL DEFAULT 'VISUALIZADOR',
    criado_em     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_membro_salon   FOREIGN KEY (salon_id)   REFERENCES salons(id)   ON DELETE CASCADE,
    CONSTRAINT fk_membro_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,

    -- One role per user per salon
    CONSTRAINT uk_membro_studio UNIQUE (salon_id, usuario_id),

    CONSTRAINT chk_funcao_studio CHECK (funcao IN (
        'PROPRIETARIO',   -- Full access: manage team, connect accounts, publish, edit, view
        'GESTOR',         -- Publish + schedule + create/edit; cannot manage team
        'EDITOR',         -- Create/edit/schedule drafts; cannot publish directly
        'VISUALIZADOR'    -- Read-only access
    ))
);

CREATE INDEX IF NOT EXISTS idx_membro_studio_salon   ON membros_studio(salon_id);
CREATE INDEX IF NOT EXISTS idx_membro_studio_usuario ON membros_studio(usuario_id);

COMMENT ON TABLE membros_studio IS 'Per-salon team roles for the Social Studio module';
COMMENT ON COLUMN membros_studio.funcao IS 'Studio role: PROPRIETARIO > GESTOR > EDITOR > VISUALIZADOR';
