-- =============================================
-- Migration V9: Create Image Tables
-- Social Studio IA - Image Management
-- =============================================

-- Table: imagens
-- Stores uploaded images with AI processing capabilities
CREATE TABLE imagens (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL,
    criador_id BIGINT NOT NULL,
    url_original VARCHAR(1000) NOT NULL,
    url_atual VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    nome_arquivo VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    tipo_mime VARCHAR(50) NOT NULL,
    largura INT NOT NULL,
    altura INT NOT NULL,
    descricao VARCHAR(200),
    total_versoes INT NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_imagem_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT fk_imagem_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_imagem_tamanho CHECK (tamanho_bytes > 0),
    CONSTRAINT chk_imagem_dimensoes CHECK (largura > 0 AND altura > 0)
);

-- Indexes for imagens
CREATE INDEX idx_imagem_salon ON imagens(salon_id);
CREATE INDEX idx_imagem_criador ON imagens(criador_id);
CREATE INDEX idx_imagem_criado_em ON imagens(criado_em);
CREATE INDEX idx_imagem_ativo ON imagens(ativo);

-- Table: imagem_versoes
-- Stores edit history of images (each AI operation creates a version)
CREATE TABLE imagem_versoes (
    id BIGSERIAL PRIMARY KEY,
    imagem_id BIGINT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    operacao VARCHAR(50) NOT NULL,
    parametros VARCHAR(200),
    tamanho_bytes BIGINT NOT NULL,
    largura INT NOT NULL,
    altura INT NOT NULL,
    numero_versao INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_versao_imagem FOREIGN KEY (imagem_id) REFERENCES imagens(id) ON DELETE CASCADE,
    CONSTRAINT chk_versao_tamanho CHECK (tamanho_bytes > 0),
    CONSTRAINT chk_versao_dimensoes CHECK (largura > 0 AND altura > 0),
    CONSTRAINT chk_versao_numero CHECK (numero_versao > 0)
);

-- Indexes for imagem_versoes
CREATE INDEX idx_versao_imagem ON imagem_versoes(imagem_id);
CREATE INDEX idx_versao_criado_em ON imagem_versoes(criado_em);

-- Comments
COMMENT ON TABLE imagens IS 'Stores uploaded images for Social Studio';
COMMENT ON TABLE imagem_versoes IS 'Stores edit history and versions of images';

COMMENT ON COLUMN imagens.url_original IS 'S3 URL of the original uploaded image';
COMMENT ON COLUMN imagens.url_atual IS 'S3 URL of the current/active version';
COMMENT ON COLUMN imagens.thumbnail_url IS 'S3 URL of the thumbnail image';
COMMENT ON COLUMN imagens.total_versoes IS 'Total number of versions (including original)';
COMMENT ON COLUMN imagens.ativo IS 'Soft delete flag';

COMMENT ON COLUMN imagem_versoes.operacao IS 'AI operation: enhance, remove-bg, blur-bg, apply-style, upscale, crop';
COMMENT ON COLUMN imagem_versoes.parametros IS 'JSON string with operation parameters';
COMMENT ON COLUMN imagem_versoes.numero_versao IS 'Sequential version number';

-- Add trigger to update atualizado_em on imagens
CREATE OR REPLACE FUNCTION update_imagem_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_imagem_atualizado_em
    BEFORE UPDATE ON imagens
    FOR EACH ROW
    EXECUTE FUNCTION update_imagem_atualizado_em();
