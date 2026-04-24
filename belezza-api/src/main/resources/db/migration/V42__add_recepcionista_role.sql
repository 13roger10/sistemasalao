-- Add RECEPCIONISTA to the allowed roles in usuarios table
ALTER TABLE usuarios
    DROP CONSTRAINT IF EXISTS chk_usuarios_role;

ALTER TABLE usuarios
    ADD CONSTRAINT chk_usuarios_role CHECK (role IN ('ADMIN', 'PROFISSIONAL', 'CLIENTE', 'RECEPCIONISTA'));
