# ETAPA 5 - INTEGRAÇÃO WHATSAPP

## ✅ Implementação Completa

Esta etapa implementa a integração completa com WhatsApp Business API (Meta Cloud API) para envio de mensagens, lembretes automáticos e rastreamento de status de entrega.

---

## 📋 Resumo da Implementação

### 1. ✅ WhatsApp Service - Integração com Meta Cloud API

#### WhatsAppService Interface
- **Arquivo**: [WhatsAppService.java](src/main/java/com/belezza/api/integration/WhatsAppService.java)
- **Métodos**:
  - `enviarMensagem(telefone, templateName, params)` - Envia mensagem via template
  - `enviarMensagemDireta(telefone, mensagem)` - Envia mensagem de texto
  - `enviarImagem(telefone, imageUrl, caption)` - Envia imagem com legenda
  - `enviarConfirmacaoAgendamento(...)` - Template de confirmação
  - `enviarLembrete24h(...)` - Template de lembrete 24h antes
  - `enviarLembrete2h(...)` - Template de lembrete 2h antes
  - `enviarPosAtendimento(...)` - Template pós-atendimento

#### WhatsAppServiceImpl
- **Arquivo**: [WhatsAppServiceImpl.java](src/main/java/com/belezza/api/integration/impl/WhatsAppServiceImpl.java)
- **Características**:
  - Client HTTP com RestTemplate
  - Integração com Meta Cloud API v18.0
  - Normalização automática de telefones (+5511999999999)
  - Headers com Bearer token
  - Logs de requisições e respostas
  - Tratamento de erros
  - Salvamento de logs no banco de dados

### 2. ✅ Templates de Mensagem

#### Mensagens Implementadas

**1. Confirmação de Agendamento**
```
Olá {nome}! 👋

Seu agendamento foi confirmado:
📅 {data} às {hora}
💇 {servico} com {profissional}
📍 {endereco}

Para cancelar ou reagendar: {link}

Aguardamos você!
```

**2. Lembrete 24 Horas**
```
Olá {nome}! 🔔

Lembrete: Você tem um agendamento amanhã!
📅 {data} às {hora}
💇 {servico}

Confirme sua presença: {link}

Até breve!
```

**3. Lembrete 2 Horas**
```
Olá {nome}! ⏰

Seu horário está chegando!
⏰ Daqui a 2 horas: {hora}
💇 {servico}
📍 {endereco}

Aguardamos você!
```

**4. Pós-Atendimento**
```
Olá {nome}! 😊

Obrigado pela visita!

Que tal avaliar nosso atendimento?
⭐ {link_avaliacao}

Sua opinião é muito importante para nós!
```

### 3. ✅ Log de Mensagens

#### WhatsAppMessage Entity
- **Arquivo**: [WhatsAppMessage.java](src/main/java/com/belezza/api/entity/WhatsAppMessage.java)
- **Campos**:
  - `messageId` - ID retornado pela API WhatsApp (único)
  - `telefone` - Número do destinatário
  - `tipo` - template, text, image
  - `templateName` - Nome do template (se aplicável)
  - `conteudo` - Conteúdo da mensagem
  - `status` - SENT, DELIVERED, READ, FAILED, RETRYING
  - `errorMessage` - Mensagem de erro (se falhou)
  - `agendamento` - Relacionamento com agendamento
  - `salon` - Relacionamento com salão
  - `criadoEm` - Data/hora de envio
  - `entregueEm` - Data/hora de entrega
  - `lidoEm` - Data/hora de leitura
  - `tentativas` - Número de tentativas

#### WhatsAppMessageStatus Enum
- **Arquivo**: [WhatsAppMessageStatus.java](src/main/java/com/belezza/api/entity/WhatsAppMessageStatus.java)
- **Valores**:
  - `SENT` - Mensagem enviada
  - `DELIVERED` - Mensagem entregue
  - `READ` - Mensagem lida
  - `FAILED` - Falha no envio
  - `RETRYING` - Aguardando retry

#### WhatsAppMessageRepository
- **Arquivo**: [WhatsAppMessageRepository.java](src/main/java/com/belezza/api/repository/WhatsAppMessageRepository.java)
- **Queries**:
  - `findByMessageId` - Buscar por ID do WhatsApp
  - `findByAgendamentoIdOrderByCriadoEmDesc` - Mensagens por agendamento
  - `findRetryableFailed` - Mensagens para retry
  - `countBySalonAndStatusBetween` - Métricas de mensagens
  - `countMonthlySent` - Total mensal por salão

### 4. ✅ Webhook de Status

#### WhatsAppWebhookController
- **Arquivo**: [WhatsAppWebhookController.java](src/main/java/com/belezza/api/controller/WhatsAppWebhookController.java)
- **Endpoints**:

**GET /api/webhooks/whatsapp** - Verificação do webhook
```bash
# WhatsApp envia este request para verificar o webhook
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=CHALLENGE&hub.verify_token=TOKEN

# Resposta: retorna o challenge se token válido
```

**POST /api/webhooks/whatsapp** - Receber eventos
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": 1234567890
        }]
      }
    }]
  }]
}
```

- **Processamento**:
  - Atualiza status da mensagem no banco
  - Registra timestamps (entregue_em, lido_em)
  - Logs de auditoria
  - Sempre retorna 200 OK (evita retries do WhatsApp)

### 5. ✅ Scheduler de Lembretes

#### LembreteAgendamentoJob
- **Arquivo**: [LembreteAgendamentoJob.java](src/main/java/com/belezza/api/scheduler/LembreteAgendamentoJob.java)

**Job 1: Lembrete 24 Horas**
- **Frequência**: A cada 30 minutos
- **Lógica**:
  - Busca agendamentos confirmados 24h no futuro (±15 min)
  - Filtra apenas os que não receberam lembrete 24h
  - Envia mensagem via WhatsAppService
  - Marca `lembreteEnviado24h = true`
  - Gera link de confirmação com token único

**Job 2: Lembrete 2 Horas**
- **Frequência**: A cada 15 minutos
- **Lógica**:
  - Busca agendamentos confirmados 2h no futuro (±7 min)
  - Filtra apenas os que não receberam lembrete 2h
  - Envia mensagem via WhatsAppService
  - Marca `lembreteEnviado2h = true`

**Configuração**:
```yaml
# application.yml
app:
  frontend-url: http://localhost:3000
  whatsapp:
    lembretes:
      enabled: true # habilita/desabilita lembretes
```

### 6. ✅ Configuração

#### application.yml
- **Configurações WhatsApp**:
```yaml
whatsapp:
  phone-number-id: ${WHATSAPP_PHONE_NUMBER_ID:}
  business-account-id: ${WHATSAPP_BUSINESS_ACCOUNT_ID:}
  access-token: ${WHATSAPP_ACCESS_TOKEN:}
  webhook-verify-token: ${WHATSAPP_WEBHOOK_VERIFY_TOKEN:}
  api-version: v18.0
  api-url: https://graph.facebook.com
```

#### RestTemplate Bean
- **Arquivo**: [AppConfig.java](src/main/java/com/belezza/api/config/AppConfig.java)
- **Configuração**:
  - Connect timeout: 10 segundos
  - Read timeout: 30 segundos
  - Usado por todas as integrações externas

### 7. ✅ Migration do Banco de Dados

#### V11__create_whatsapp_messages_table.sql
- **Arquivo**: [V11__create_whatsapp_messages_table.sql](src/main/resources/db/migration/V11__create_whatsapp_messages_table.sql)
- **Tabela**: `whatsapp_messages`
- **Índices**:
  - `idx_whatsapp_messages_message_id`
  - `idx_whatsapp_messages_telefone`
  - `idx_whatsapp_messages_status`
  - `idx_whatsapp_messages_agendamento`
  - `idx_whatsapp_messages_salon`
  - `idx_whatsapp_messages_criado_em`

---

## 🚀 Como Usar

### 1. Configurar Credenciais WhatsApp

**Obter credenciais na Meta for Developers:**

1. Acessar https://developers.facebook.com/
2. Criar um App Business
3. Adicionar produto "WhatsApp"
4. Gerar um token de acesso permanente
5. Obter Phone Number ID

**Configurar no ambiente:**

```bash
# .env ou variáveis de ambiente
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=belezza_whatsapp_verify
```

### 2. Configurar Webhook no Meta

1. No painel do WhatsApp Business, ir em Configuration
2. Configurar Webhook URL:
   ```
   https://api.belezza.ai/api/webhooks/whatsapp
   ```
3. Verify Token: `belezza_whatsapp_verify`
4. Subscrever aos eventos: `messages`

### 3. Enviar Mensagem Manualmente

```java
@Autowired
private WhatsAppService whatsAppService;

public void enviarConfirmacao(Agendamento agendamento) {
    String messageId = whatsAppService.enviarConfirmacaoAgendamento(
        agendamento.getCliente().getTelefone(),
        agendamento.getCliente().getNome(),
        "15/02/2024",
        "14:30",
        "Corte Masculino",
        "João Silva",
        "Rua ABC, 123",
        "https://belezza.ai/confirmar/abc123"
    );

    log.info("Mensagem enviada: {}", messageId);
}
```

### 4. Lembretes Automáticos

Os lembretes são enviados automaticamente pelos schedulers:

- ✅ **24h antes**: Enviado automaticamente para todos os agendamentos confirmados
- ✅ **2h antes**: Enviado automaticamente para todos os agendamentos confirmados

**Desabilitar temporariamente:**
```yaml
# application.yml
app:
  whatsapp:
    lembretes:
      enabled: false
```

### 5. Verificar Logs de Mensagens

```java
@Autowired
private WhatsAppMessageRepository messageRepository;

// Buscar mensagens de um agendamento
List<WhatsAppMessage> messages = messageRepository
    .findByAgendamentoIdOrderByCriadoEmDesc(agendamentoId);

// Verificar status
for (WhatsAppMessage msg : messages) {
    System.out.println(msg.getStatus()); // SENT, DELIVERED, READ
    System.out.println(msg.getEntregueEm());
    System.out.println(msg.getLidoEm());
}
```

---

## 📊 Métricas Disponíveis

### 1. Total de Mensagens Enviadas (Mês Atual)

```java
LocalDateTime firstDayOfMonth = LocalDateTime.now()
    .withDayOfMonth(1)
    .withHour(0)
    .withMinute(0);

long total = messageRepository.countMonthlySent(salonId, firstDayOfMonth);
```

### 2. Taxa de Entrega

```java
LocalDateTime start = LocalDateTime.now().minusDays(7);
LocalDateTime end = LocalDateTime.now();

long sent = messageRepository.countBySalonAndStatusBetween(
    salonId, WhatsAppMessageStatus.SENT, start, end
);
long delivered = messageRepository.countBySalonAndStatusBetween(
    salonId, WhatsAppMessageStatus.DELIVERED, start, end
);

double deliveryRate = (double) delivered / sent * 100;
```

### 3. Taxa de Leitura

```java
long read = messageRepository.countBySalonAndStatusBetween(
    salonId, WhatsAppMessageStatus.READ, start, end
);

double readRate = (double) read / delivered * 100;
```

---

## 🔧 Configurações Avançadas

### 1. Retry de Mensagens Falhadas

Criar um job scheduler para reenviar mensagens que falharam:

```java
@Scheduled(fixedRate = 3600000) // 1 hora
public void retryFailedMessages() {
    LocalDateTime since = LocalDateTime.now().minusHours(24);
    List<WhatsAppMessage> failed = messageRepository.findRetryableFailed(since);

    for (WhatsAppMessage msg : failed) {
        // Reenviar mensagem
        whatsAppService.enviarMensagemDireta(msg.getTelefone(), msg.getConteudo());
        msg.setTentativas(msg.getTentativas() + 1);
        messageRepository.save(msg);
    }
}
```

### 2. Limites por Plano

Verificar limite de mensagens antes de enviar:

```java
public boolean podeEnviarMensagem(Long salonId) {
    Salon salon = salonRepository.findById(salonId).orElseThrow();

    LocalDateTime firstDay = LocalDateTime.now().withDayOfMonth(1);
    long mensagensEnviadas = messageRepository.countMonthlySent(salonId, firstDay);

    int limite = switch (salon.getPlano()) {
        case FREE -> 0;
        case PRO -> 500;
        case PREMIUM -> 5000;
    };

    return mensagensEnviadas < limite;
}
```

### 3. Personalizar Templates

Editar os templates diretamente no `WhatsAppServiceImpl`:

```java
@Override
public String enviarLembrete24h(...) {
    String mensagem = String.format(
        """
        🌟 BELEZZA STUDIO 🌟

        Olá %s!

        Amanhã é dia de cuidar de você! ✨
        📅 %s às %s
        💇 %s

        Mal podemos esperar para vê-lo(a)!

        Cancelar? %s
        """,
        nomeCliente, data, hora, servico, linkConfirmacao
    );

    return enviarMensagemDireta(telefone, mensagem);
}
```

---

## 🧪 Testes

### 1. Testar Envio de Mensagem

```bash
# POST /api/admin/test/whatsapp/send
curl -X POST http://localhost:8080/api/admin/test/whatsapp/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "+5511999999999",
    "mensagem": "Teste de integração WhatsApp"
  }'
```

### 2. Testar Webhook

```bash
# GET - Verificação
curl "http://localhost:8080/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=TEST123&hub.verify_token=belezza_whatsapp_verify"

# POST - Evento de status
curl -X POST http://localhost:8080/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "statuses": [{
            "id": "wamid.test123",
            "status": "delivered",
            "timestamp": 1234567890
          }]
        }
      }]
    }]
  }'
```

### 3. Verificar Scheduler

Verificar logs para confirmar execução:

```bash
# Ver logs do scheduler
docker-compose logs -f api | grep "Lembrete"

# Deve aparecer:
# Enviando lembretes de 24h para 3 agendamentos
# Lembrete 24h enviado para agendamento 123
# Lembretes de 24h processados: 3 enviados
```

---

## ✅ Checklist de Implementação

### Serviço de Integração
- [x] WhatsAppService interface criada
- [x] WhatsAppServiceImpl implementado
- [x] Client HTTP com RestTemplate
- [x] Normalização de telefones
- [x] Tratamento de erros
- [x] Logs de requisições

### Templates de Mensagem
- [x] Template de confirmação
- [x] Template de lembrete 24h
- [x] Template de lembrete 2h
- [x] Template pós-atendimento
- [x] Mensagens com emojis
- [x] Links de ação

### Log de Mensagens
- [x] Entidade WhatsAppMessage
- [x] Enum WhatsAppMessageStatus
- [x] WhatsAppMessageRepository
- [x] Queries de busca e métricas
- [x] Índices de performance

### Webhook de Status
- [x] WhatsAppWebhookController
- [x] Endpoint de verificação (GET)
- [x] Endpoint de eventos (POST)
- [x] Processamento de status
- [x] Atualização no banco
- [x] Timestamps de entrega/leitura

### Scheduler de Lembretes
- [x] LembreteAgendamentoJob criado
- [x] Job de lembrete 24h (30 min)
- [x] Job de lembrete 2h (15 min)
- [x] Queries no repository
- [x] Flags de lembrete enviado
- [x] Configuração enable/disable

### Configuração
- [x] Variáveis de ambiente
- [x] RestTemplate bean
- [x] Timeout configurado
- [x] Frontend URL configurável

### Database
- [x] Migration V11 criada
- [x] Tabela whatsapp_messages
- [x] Índices de performance
- [x] Foreign keys
- [x] Comentários

### Documentação
- [x] ETAPA_5_SUMMARY.md
- [x] Guia de configuração
- [x] Exemplos de uso
- [x] Guia de testes

---

## 🎉 Conclusão

A **ETAPA 5 - INTEGRAÇÃO WHATSAPP** foi implementada com sucesso!

O sistema agora possui:
- ✅ Integração completa com Meta Cloud API
- ✅ Templates de mensagens profissionais
- ✅ Lembretes automáticos (24h e 2h)
- ✅ Rastreamento de status de entrega
- ✅ Logs detalhados de mensagens
- ✅ Webhook para atualizações em tempo real
- ✅ Scheduler robusto e configurável
- ✅ Métricas de engajamento

**Pronto para enviar milhares de mensagens!** 📱💬

---

## 📞 Próximos Passos

### Melhorias Futuras (Opcional)

1. **Templates Aprovados pelo WhatsApp**:
   - Criar templates oficiais no painel do Meta
   - Usar API de templates para mensagens em massa
   - Suportar variáveis dinâmicas

2. **Mensagens Rich Media**:
   - Envio de documentos (PDF)
   - Envio de vídeos
   - Mensagens com botões interativos
   - Listas de seleção

3. **Chatbot**:
   - Receber mensagens dos clientes
   - Respostas automáticas
   - Integração com IA para atendimento

4. **Campanhas de Marketing**:
   - Envio em massa segmentado
   - Agendamento de campanhas
   - A/B testing de mensagens
   - Analytics avançado

5. **Compliance**:
   - Opt-in/opt-out de mensagens
   - LGPD/GDPR compliance
   - Blacklist de números
   - Horários permitidos

---

**Data de Implementação**: 2024-02-08
**Versão**: 1.0.0
**Status**: ✅ Completo
