-- BUG-016 (auditoria): tokens emitidos antes da última troca de senha deixam de valer
ALTER TABLE usuarios ADD COLUMN senha_alterada_em TIMESTAMP;
