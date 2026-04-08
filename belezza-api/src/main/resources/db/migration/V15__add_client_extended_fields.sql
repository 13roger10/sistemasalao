-- Belezza API - Migration V15
-- Add extended fields to clients table for better client management

-- Add new columns to clientes table (H2 compatible - one ALTER per column)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_gasto DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ticket_medio DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS aceita_marketing BOOLEAN DEFAULT TRUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS aceita_whatsapp BOOLEAN DEFAULT TRUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS aceita_email BOOLEAN DEFAULT TRUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_visita TIMESTAMP;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS primeira_visita TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cliente_data_nascimento ON clientes(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_cliente_ultima_visita ON clientes(ultima_visita);
