-- Item 8: Public API — API Keys table
CREATE TABLE api_keys (
    id            BIGSERIAL    PRIMARY KEY,
    salon_id      BIGINT       NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    nome          VARCHAR(100) NOT NULL,
    key_prefix    VARCHAR(10)  NOT NULL,           -- First 8 chars shown in UI (bz_live_ab12...)
    key_hash      VARCHAR(64)  NOT NULL UNIQUE,    -- SHA-256 of the full key (hex)
    escopos       VARCHAR(500) NOT NULL DEFAULT 'read', -- comma-separated: read,write
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_uso_em TIMESTAMP,
    expira_em     TIMESTAMP,                       -- NULL = never expires
    criado_em     TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_salon   ON api_keys(salon_id);
CREATE INDEX idx_api_keys_hash    ON api_keys(key_hash);
CREATE INDEX idx_api_keys_ativo   ON api_keys(ativo);
