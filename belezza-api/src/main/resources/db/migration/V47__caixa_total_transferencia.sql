-- Transferência com total próprio no fechamento do caixa (BUG-034): antes era somada ao débito.
-- Caixas já fechados continuam com a transferência dentro de total_debito.
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS total_transferencia NUMERIC(10, 2);
