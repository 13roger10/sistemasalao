-- Falta automática após 30 minutos: quando a equipe desfaz a falta (o cliente chegou atrasado),
-- o agendamento é marcado para que a rotina automática não o marque como falta de novo.
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS no_show_desfeito BOOLEAN NOT NULL DEFAULT FALSE;
