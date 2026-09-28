-- Pagamento dividido e troco (BUG-008).
-- Um atendimento pode ter vários pagamentos (ex.: PIX 50 + dinheiro 50): cada parte é uma linha,
-- e a soma das partes aprovadas é validada contra o valor do atendimento no serviço. A proteção
-- contra cobrança dupla passa a ser um lock no agendamento, em vez da restrição UNIQUE.
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_agendamento_id_key;
CREATE INDEX IF NOT EXISTS idx_pagamento_agendamento ON pagamentos (agendamento_id);

-- Em dinheiro: quanto o cliente entregou e o troco devolvido (valor = parte do serviço).
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS valor_recebido DECIMAL(10,2) NULL;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS troco DECIMAL(10,2) NULL;
