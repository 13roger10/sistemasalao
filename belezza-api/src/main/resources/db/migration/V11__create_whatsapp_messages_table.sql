-- WhatsApp Messages Table
-- Tracks all WhatsApp messages sent via Meta Cloud API

CREATE TABLE whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- template, text, image
    template_name VARCHAR(100),
    conteudo TEXT,
    status VARCHAR(20) NOT NULL, -- SENT, DELIVERED, READ, FAILED, RETRYING
    error_message TEXT,
    agendamento_id BIGINT,
    salon_id BIGINT,
    criado_em TIMESTAMP NOT NULL,
    entregue_em TIMESTAMP,
    lido_em TIMESTAMP,
    tentativas INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_whatsapp_agendamento FOREIGN KEY (agendamento_id)
        REFERENCES agendamentos(id) ON DELETE SET NULL,
    CONSTRAINT fk_whatsapp_salon FOREIGN KEY (salon_id)
        REFERENCES salons(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX idx_whatsapp_messages_telefone ON whatsapp_messages(telefone);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_agendamento ON whatsapp_messages(agendamento_id);
CREATE INDEX idx_whatsapp_messages_salon ON whatsapp_messages(salon_id);
CREATE INDEX idx_whatsapp_messages_criado_em ON whatsapp_messages(criado_em);

-- Comment on table
COMMENT ON TABLE whatsapp_messages IS 'Log de mensagens WhatsApp enviadas via Meta Cloud API';
COMMENT ON COLUMN whatsapp_messages.message_id IS 'ID da mensagem retornado pela API do WhatsApp';
COMMENT ON COLUMN whatsapp_messages.tipo IS 'Tipo de mensagem: template, text, image';
COMMENT ON COLUMN whatsapp_messages.status IS 'Status da mensagem: SENT, DELIVERED, READ, FAILED, RETRYING';
COMMENT ON COLUMN whatsapp_messages.tentativas IS 'Número de tentativas de envio';
