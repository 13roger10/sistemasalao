# 🚀 Guia Rápido: Múltiplos Serviços em Agendamentos

## ⚙️ Nova Funcionalidade

A partir da versão com a migração V12, o sistema suporta **múltiplos serviços em um único agendamento**.

---

## 📋 Conceitos

### Agendamento com Serviço Único (Legacy)

```json
{
  "profissionalId": 1,
  "servicoId": 10,
  "dataHora": "2026-02-10T14:00:00"
}
```

**Resultado:**
- Um serviço: Corte Feminino (30min)
- Duração total: 30 minutos
- Fim previsto: 14:30

### Agendamento com Múltiplos Serviços (Novo)

```json
{
  "profissionalId": 1,
  "servicoIds": [10, 15, 20],
  "tempoPreparacaoEntreServicosMinutos": 10,
  "dataHora": "2026-02-10T14:00:00"
}
```

**Resultado:**
- Serviço 1: Corte Feminino (30min)
- Preparação: 10min
- Serviço 2: Coloração (120min)
- Preparação: 10min
- Serviço 3: Escova (45min)
- **Duração total: 215 minutos (3h35min)**
- **Fim previsto: 17:35**

---

## 🔧 Como Usar

### 1. Criar Agendamento com Múltiplos Serviços

**Endpoint:** `POST /api/agendamentos`

**Request:**
```bash
curl -X POST http://localhost:8080/api/agendamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profissionalId": 1,
    "servicoIds": [10, 15, 20],
    "tempoPreparacaoEntreServicosMinutos": 10,
    "dataHora": "2026-02-10T14:00:00",
    "observacoes": "Pacote completo de beleza"
  }'
```

**Response:**
```json
{
  "id": 123,
  "salonId": 1,
  "salonNome": "Belezza Studio",
  "clienteId": 45,
  "clienteNome": "Ana Silva",
  "profissionalId": 1,
  "profissionalNome": "Maria Santos",

  "servicos": [
    {
      "servicoId": 10,
      "servicoNome": "Corte Feminino",
      "servicoDescricao": "Corte e finalização",
      "servicoPreco": 50.00,
      "ordem": 1,
      "duracaoPrevistaMinutos": 30,
      "tempoPreparacaoMinutos": 0
    },
    {
      "servicoId": 15,
      "servicoNome": "Coloração Completa",
      "servicoDescricao": "Coloração + matização",
      "servicoPreco": 180.00,
      "ordem": 2,
      "duracaoPrevistaMinutos": 120,
      "tempoPreparacaoMinutos": 10
    },
    {
      "servicoId": 20,
      "servicoNome": "Escova",
      "servicoDescricao": "Escova modeladora",
      "servicoPreco": 40.00,
      "ordem": 3,
      "duracaoPrevistaMinutos": 45,
      "tempoPreparacaoMinutos": 10
    }
  ],

  "duracaoTotalMinutos": 215,
  "dataHora": "2026-02-10T14:00:00",
  "fimPrevisto": "2026-02-10T17:35:00",
  "status": "PENDENTE",
  "valorCobrado": 270.00,
  "criadoEm": "2026-02-09T12:00:00"
}
```

---

### 2. Entender o Cálculo de Duração

**Fórmula:**
```
Duração Total = Σ(duração de cada serviço) + (n-1) × tempo de preparação
```

**Exemplo:**
- Serviço 1: 30 min
- Preparação: 0 min (primeiro serviço não tem preparação)
- Serviço 2: 120 min
- Preparação: 10 min
- Serviço 3: 45 min
- Preparação: 10 min

**Total:** 30 + 0 + 120 + 10 + 45 + 10 = **215 minutos**

---

### 3. Tempo de Preparação Entre Serviços

O campo `tempoPreparacaoEntreServicosMinutos` é **opcional**.

**Quando usar:**
- Limpeza de equipamentos
- Setup para próximo serviço
- Pausa/descanso do profissional
- Secagem de produtos

**Valores recomendados:**
- 0 min: Serviços consecutivos sem pausa
- 5-10 min: Pausa rápida
- 15-20 min: Pausa completa com limpeza

**Se não informado:** Padrão é **0 minutos**

```json
{
  "servicoIds": [10, 15],
  "tempoPreparacaoEntreServicosMinutos": 15
}
```

**Resultado:**
- Serviço 1: 30 min
- **Preparação: 15 min** 🕒
- Serviço 2: 120 min
- **Total: 165 min**

---

### 4. Ordem dos Serviços

Os serviços são executados **na ordem em que são fornecidos** no array `servicoIds`.

```json
{
  "servicoIds": [10, 15, 20]
}
```

**Ordem de execução:**
1. Serviço ID 10 (primeiro)
2. Serviço ID 15 (segundo)
3. Serviço ID 20 (terceiro)

**IMPORTANTE:** A ordem importa! No response, cada serviço tem um campo `ordem`:
- `ordem: 1` → Primeiro serviço
- `ordem: 2` → Segundo serviço
- `ordem: 3` → Terceiro serviço

---

### 5. Validações

#### ✅ Validação 1: Não pode misturar servicoId e servicoIds

**ERRADO:**
```json
{
  "servicoId": 10,
  "servicoIds": [15, 20]
}
```
❌ **Erro:** "Forneça apenas servicoId OU servicoIds, não ambos"

**CORRETO:**
```json
{
  "servicoIds": [10, 15, 20]
}
```

#### ✅ Validação 2: Deve fornecer ao menos um serviço

**ERRADO:**
```json
{
  "profissionalId": 1,
  "dataHora": "2026-02-10T14:00:00"
}
```
❌ **Erro:** "É obrigatório fornecer servicoId ou servicoIds"

#### ✅ Validação 3: Todos os serviços devem ser do mesmo salão

**ERRADO:**
```json
{
  "servicoIds": [10, 999]
}
// Se serviço 999 é de outro salão
```
❌ **Erro:** "Todos os serviços devem pertencer ao mesmo salão"

#### ✅ Validação 4: Disponibilidade do profissional

O sistema valida se o profissional está **disponível durante toda a duração** (incluindo todos os serviços + preparações).

**Exemplo:**
- Agendamento: 14:00 - 17:35 (3h35min)
- Sistema verifica se há conflitos entre 14:00 e 17:35
- Se houver outro agendamento às 16:00, será bloqueado

---

## 📊 Compatibilidade com Agendamentos Antigos

### Backward Compatibility

**Agendamentos antigos** (criados com `servicoId` único) continuam funcionando normalmente.

**No banco de dados:**
```sql
-- Agendamento antigo (single service)
agendamentos.servico_id = 10

-- Agendamento novo (multiple services)
agendamentos.servico_id = NULL
agendamento_servicos:
  - (agendamento_id=123, servico_id=10, ordem=1)
  - (agendamento_id=123, servico_id=15, ordem=2)
  - (agendamento_id=123, servico_id=20, ordem=3)
```

**No Response da API:**
Ambos retornam a lista `servicos[]`:

**Agendamento antigo:**
```json
{
  "id": 100,
  "servicoId": 10,
  "servicoNome": "Corte Feminino",
  "servicos": [
    {
      "servicoId": 10,
      "servicoNome": "Corte Feminino",
      "ordem": 1,
      "duracaoPrevistaMinutos": 30
    }
  ],
  "duracaoTotalMinutos": 30
}
```

**Agendamento novo:**
```json
{
  "id": 123,
  "servicoId": null,
  "servicoNome": null,
  "servicos": [
    { "servicoId": 10, "ordem": 1 },
    { "servicoId": 15, "ordem": 2 },
    { "servicoId": 20, "ordem": 3 }
  ],
  "duracaoTotalMinutos": 215
}
```

**Campos deprecated:**
- `servicoId` (Long) - Deprecated, use `servicos[0].servicoId`
- `servicoNome` (String) - Deprecated, use `servicos[0].servicoNome`
- `servicoDuracaoMinutos` (int) - Deprecated, use `duracaoTotalMinutos`

---

## 🎯 Casos de Uso

### Caso 1: Pacote Simples (2 serviços)

**Cenário:** Cliente quer corte + escova

```bash
curl -X POST http://localhost:8080/api/agendamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profissionalId": 1,
    "servicoIds": [10, 20],
    "tempoPreparacaoEntreServicosMinutos": 5,
    "dataHora": "2026-02-10T14:00:00"
  }'
```

**Resultado:**
- 14:00 - 14:30: Corte (30min)
- 14:30 - 14:35: Preparação (5min)
- 14:35 - 15:20: Escova (45min)
- **Total: 80 minutos**
- **Fim previsto: 15:20**

### Caso 2: Pacote Completo (3+ serviços)

**Cenário:** Dia de beleza completo

```bash
curl -X POST http://localhost:8080/api/agendamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profissionalId": 1,
    "servicoIds": [10, 15, 20, 25],
    "tempoPreparacaoEntreServicosMinutos": 10,
    "dataHora": "2026-02-10T09:00:00",
    "observacoes": "Pacote Noiva"
  }'
```

**IDs dos serviços:**
- 10: Corte (30min)
- 15: Coloração (120min)
- 20: Escova (45min)
- 25: Maquiagem (60min)

**Timeline:**
- 09:00 - 09:30: Corte
- 09:30 - 09:40: Preparação
- 09:40 - 11:40: Coloração
- 11:40 - 11:50: Preparação
- 11:50 - 12:35: Escova
- 12:35 - 12:45: Preparação
- 12:45 - 13:45: Maquiagem
- **Total: 285 minutos (4h45min)**
- **Fim previsto: 13:45**

### Caso 3: Serviço Único (compatibilidade)

**Cenário:** Cliente quer apenas um corte

**Opção A (nova):**
```json
{
  "servicoIds": [10]
}
```

**Opção B (legacy):**
```json
{
  "servicoId": 10
}
```

**Ambas funcionam!** ✅

---

## 🔍 Consultar Agendamentos

### Buscar por ID

```bash
curl -X GET http://localhost:8080/api/agendamentos/123 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": 123,
  "servicos": [
    {
      "servicoId": 10,
      "servicoNome": "Corte Feminino",
      "servicoPreco": 50.00,
      "ordem": 1,
      "duracaoPrevistaMinutos": 30,
      "tempoPreparacaoMinutos": 0
    },
    {
      "servicoId": 15,
      "servicoNome": "Coloração",
      "servicoPreco": 180.00,
      "ordem": 2,
      "duracaoPrevistaMinutos": 120,
      "tempoPreparacaoMinutos": 10
    }
  ],
  "duracaoTotalMinutos": 160,
  "valorCobrado": 230.00
}
```

### Listar Agenda Diária

```bash
curl -X GET "http://localhost:8080/api/agendamentos/profissional/1/agenda/diaria?data=2026-02-10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": 100,
    "dataHora": "2026-02-10T09:00:00",
    "fimPrevisto": "2026-02-10T09:30:00",
    "duracaoTotalMinutos": 30,
    "servicos": [
      { "servicoNome": "Corte", "ordem": 1 }
    ]
  },
  {
    "id": 123,
    "dataHora": "2026-02-10T14:00:00",
    "fimPrevisto": "2026-02-10T17:35:00",
    "duracaoTotalMinutos": 215,
    "servicos": [
      { "servicoNome": "Corte", "ordem": 1 },
      { "servicoNome": "Coloração", "ordem": 2 },
      { "servicoNome": "Escova", "ordem": 3 }
    ]
  }
]
```

**Visual da agenda:**
```
09:00 ████████ [Agendamento #100: Corte]
09:30
10:00
...
14:00 ██████████████████████████████████████████ [Agendamento #123: Corte + Coloração + Escova]
15:00
16:00
17:00
17:35
```

---

## ⚠️ Troubleshooting

### Erro: "Forneça apenas servicoId OU servicoIds"

**Causa:** Você forneceu ambos os campos

**Solução:** Use apenas um:
```json
// ERRADO
{
  "servicoId": 10,
  "servicoIds": [15, 20]
}

// CORRETO - Opção 1
{
  "servicoId": 10
}

// CORRETO - Opção 2
{
  "servicoIds": [15, 20]
}
```

### Erro: "Profissional já possui agendamento neste horário"

**Causa:** Há conflito de horário considerando a duração total

**Exemplo:**
- Agendamento existente: 14:00 - 15:00
- Novo agendamento: 14:30 - 17:00 (múltiplos serviços)
- ❌ Conflito entre 14:30 e 15:00

**Solução:**
1. Verifique a disponibilidade primeiro
2. Escolha outro horário
3. Ou reagende o agendamento existente

```bash
# Verificar disponibilidade
curl -X GET "http://localhost:8080/api/profissionais/1/disponibilidade?data=2026-02-10" \
  -H "Authorization: Bearer $TOKEN"
```

### Erro: "Todos os serviços devem pertencer ao mesmo salão"

**Causa:** Você tentou agendar serviços de salões diferentes

**Solução:** Verifique os IDs dos serviços:
```bash
# Listar serviços do salão
curl -X GET http://localhost:8080/api/servicos/salon/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Checklist de Implementação no Frontend

- [ ] Tela de agendamento suporta seleção de múltiplos serviços
- [ ] Mostra cálculo de duração total em tempo real
- [ ] Permite configurar tempo de preparação entre serviços
- [ ] Mostra visualização da agenda com múltiplos serviços
- [ ] Timeline visual dos serviços sequenciais
- [ ] Validação de conflitos antes de enviar
- [ ] Suporte para arrastar/reordenar serviços
- [ ] Exibição de preço total (soma de todos os serviços)
- [ ] Exibição de horário de término previsto

---

## ✅ Conclusão

A funcionalidade de **múltiplos serviços** está pronta para uso!

**Benefícios:**
- ✅ Agendamento de pacotes completos
- ✅ Cálculo automático de duração
- ✅ Validação de conflitos considerando duração total
- ✅ Tempo de preparação entre serviços
- ✅ Ordem customizável de execução
- ✅ 100% compatível com agendamentos antigos

**Próximos passos:**
1. Integrar no frontend
2. Criar tela de pacotes pré-configurados
3. Adicionar sugestões de combos populares
4. Implementar descontos para múltiplos serviços

---

*Documento gerado em: 09/02/2026*
*Projeto: Belezza.ai - Social Studio para Salões de Beleza*
*Desenvolvido com: Spring Boot 3.2.2 + Java 21*
