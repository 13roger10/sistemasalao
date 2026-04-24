ALTER TABLE pagamentos_profissional
    ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30);
