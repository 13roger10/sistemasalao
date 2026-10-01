-- WhatsApp e data de aniversário no usuário: obrigatórios no cadastro de novos usuários de todos
-- os perfis (antes só o cadastro de cliente tinha esses campos). Usuários antigos ficam em branco.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
