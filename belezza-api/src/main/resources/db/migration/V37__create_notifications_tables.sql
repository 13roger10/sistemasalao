-- ============================================================
-- V37: Criação das tabelas de notificações e push subscriptions
-- ============================================================

-- Tabela de notificações do sistema
CREATE TABLE IF NOT EXISTS notificacoes (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo          VARCHAR(50)  NOT NULL,
    titulo        VARCHAR(200) NOT NULL,
    mensagem      TEXT         NOT NULL,
    link          VARCHAR(500),
    icone         VARCHAR(100),
    lida          BOOLEAN      NOT NULL DEFAULT FALSE,
    enviada       BOOLEAN      NOT NULL DEFAULT FALSE,
    agendamento_id BIGINT,
    criado_em     TIMESTAMP    NOT NULL DEFAULT NOW(),
    lida_em       TIMESTAMP,
    enviada_em    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida    ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo    ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data    ON notificacoes(criado_em);

-- Tabela de push subscriptions (Web Push / PWA)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id             BIGSERIAL    PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint       TEXT         NOT NULL,
    endpoint_hash  VARCHAR(64)  NOT NULL,
    p256dh_key     TEXT         NOT NULL,
    auth_key       VARCHAR(255) NOT NULL,
    user_agent     VARCHAR(100),
    device_type    VARCHAR(50),
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMP    NOT NULL DEFAULT NOW(),
    ultimo_uso_em  TIMESTAMP,
    CONSTRAINT uk_push_subscription_endpoint UNIQUE (endpoint_hash)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_usuario  ON push_subscriptions(usuario_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint_hash);
