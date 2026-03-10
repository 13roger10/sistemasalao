-- Belezza API - Migration V15
-- Add extended fields to clients table for better client management

-- Add new columns to clientes table
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS total_gasto DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ticket_medio DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS aceita_marketing BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS aceita_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS aceita_email BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ultima_visita TIMESTAMP,
ADD COLUMN IF NOT EXISTS primeira_visita TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cliente_data_nascimento ON clientes(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_cliente_ultima_visita ON clientes(ultima_visita);

-- Comment on new columns
COMMENT ON COLUMN clientes.whatsapp IS 'WhatsApp number for client communication';
COMMENT ON COLUMN clientes.data_nascimento IS 'Client birth date for birthday promotions';
COMMENT ON COLUMN clientes.total_gasto IS 'Total amount spent by the client';
COMMENT ON COLUMN clientes.ticket_medio IS 'Average ticket value for the client';
COMMENT ON COLUMN clientes.aceita_marketing IS 'Whether the client accepts marketing communications';
COMMENT ON COLUMN clientes.aceita_whatsapp IS 'Whether the client accepts WhatsApp messages';
COMMENT ON COLUMN clientes.aceita_email IS 'Whether the client accepts email communications';
COMMENT ON COLUMN clientes.ultima_visita IS 'Last visit date for tracking inactive clients';
COMMENT ON COLUMN clientes.primeira_visita IS 'First visit date for client analytics';
