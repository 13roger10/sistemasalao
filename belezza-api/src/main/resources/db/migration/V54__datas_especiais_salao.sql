-- BUG-008 (auditoria): feriados e datas especiais não eram gravados (o POST devolvia um UUID
-- aleatório e o GET sempre []), e a agenda aceitava horário em feriado.
CREATE TABLE IF NOT EXISTS datas_especiais_salao (
    id          BIGSERIAL PRIMARY KEY,
    salon_id    BIGINT       NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    data        DATE         NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    -- FERIADO (tela Feriados) ou ESPECIAL (tela Datas especiais)
    categoria   VARCHAR(20)  NOT NULL,
    -- data especial: closed | special_hours | extended
    tipo        VARCHAR(20),
    aberto      BOOLEAN      NOT NULL DEFAULT FALSE,
    hora_inicio TIME,
    hora_fim    TIME,
    -- feriado que se repete todo ano no mesmo dia e mês
    recorrente  BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_datas_especiais_salon_data ON datas_especiais_salao (salon_id, data);
