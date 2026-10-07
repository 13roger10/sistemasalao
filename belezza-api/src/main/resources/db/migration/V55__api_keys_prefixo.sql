-- BUG-011 (auditoria): o prefixo exibido tem 16 caracteres ("bz_live_" + 8), mas a coluna
-- tinha 10 e toda criação de API key dava 500.
ALTER TABLE api_keys ALTER COLUMN key_prefix TYPE VARCHAR(20);
