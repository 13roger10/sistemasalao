-- BUG-017 (auditoria): e-mails passam a ser comparados sempre em minúsculas e sem espaços.
-- Normaliza os que foram gravados com maiúsculas (cadastro de cliente gravava o e-mail como
-- digitado). Se outra conta normaliza para o mesmo e-mail, as duas ficam como estão para
-- não violar a restrição única; esses casos precisam de revisão manual.
UPDATE usuarios u
SET email = LOWER(TRIM(u.email))
WHERE u.email <> LOWER(TRIM(u.email))
  AND NOT EXISTS (SELECT 1 FROM usuarios o WHERE o.id <> u.id AND LOWER(TRIM(o.email)) = LOWER(TRIM(u.email)));
