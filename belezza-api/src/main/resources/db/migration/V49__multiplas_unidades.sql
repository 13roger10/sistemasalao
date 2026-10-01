-- Várias unidades por administrador: cada unidade é um salão (com equipe, serviços, clientes,
-- agenda e caixa próprios) e o mesmo admin pode ser dono de várias.
-- V3 criou salons.admin_id com UNIQUE (um salão por admin); o índice idx_salon_admin continua.
ALTER TABLE salons DROP CONSTRAINT IF EXISTS salons_admin_id_key;

-- Unidade em que o admin está trabalhando: define o salão do token no login e na renovação.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade_ativa_id BIGINT;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_unidade_ativa
    FOREIGN KEY (unidade_ativa_id) REFERENCES salons(id) ON DELETE SET NULL;
