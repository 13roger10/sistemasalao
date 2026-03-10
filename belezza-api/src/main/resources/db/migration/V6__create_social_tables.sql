-- Belezza API - Migration V6
-- Create social studio tables (posts, social accounts)

-- Social media accounts connected to salons
CREATE TABLE IF NOT EXISTS contas_sociais (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL,
    plataforma VARCHAR(20) NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    account_name VARCHAR(150),
    account_image_url VARCHAR(500),
    access_token VARCHAR(1000) NOT NULL,
    refresh_token VARCHAR(1000),
    token_expira TIMESTAMP,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_conta_social_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT uk_conta_social_salon_plataforma_account UNIQUE (salon_id, plataforma, account_id),
    CONSTRAINT chk_conta_social_plataforma CHECK (plataforma IN ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP_STATUS'))
);

CREATE INDEX IF NOT EXISTS idx_conta_social_salon ON contas_sociais(salon_id);
CREATE INDEX IF NOT EXISTS idx_conta_social_plataforma ON contas_sociais(plataforma);

COMMENT ON TABLE contas_sociais IS 'Social media accounts connected to salons';

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL,
    criador_id BIGINT NOT NULL,
    imagem_url VARCHAR(1000),
    imagem_original_url VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    legenda TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',
    agendado_para TIMESTAMP,
    publicado_em TIMESTAMP,
    publish_error_message VARCHAR(200),
    tentativas_publicacao INT NOT NULL DEFAULT 0,
    curtidas INT NOT NULL DEFAULT 0,
    comentarios INT NOT NULL DEFAULT 0,
    compartilhamentos INT NOT NULL DEFAULT 0,
    alcance INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_post_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_post_status CHECK (status IN ('RASCUNHO', 'AGENDADO', 'PUBLICANDO', 'PUBLICADO', 'FALHOU'))
);

CREATE INDEX IF NOT EXISTS idx_post_salon ON posts(salon_id);
CREATE INDEX IF NOT EXISTS idx_post_criador ON posts(criador_id);
CREATE INDEX IF NOT EXISTS idx_post_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_post_agendado_para ON posts(agendado_para);

-- Post hashtags (collection table)
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id BIGINT NOT NULL,
    hashtag VARCHAR(100) NOT NULL,

    CONSTRAINT fk_hashtag_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);

-- Post platforms (collection table)
CREATE TABLE IF NOT EXISTS post_plataformas (
    post_id BIGINT NOT NULL,
    plataforma VARCHAR(20) NOT NULL,

    CONSTRAINT fk_plataforma_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT chk_post_plataforma CHECK (plataforma IN ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP_STATUS'))
);

CREATE INDEX IF NOT EXISTS idx_post_plataformas_post ON post_plataformas(post_id);

COMMENT ON TABLE posts IS 'Social media posts created in the Social Studio';
