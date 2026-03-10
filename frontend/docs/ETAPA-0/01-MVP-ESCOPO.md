# MVP - ESCOPO E FUNCIONALIDADES CORE
## Belezza.ai - Social Studio para Saloes de Beleza

---

## 1. VISAO GERAL DO MVP

### 1.1 Objetivo
Criar uma plataforma SaaS para saloes de beleza que integra:
- Agendamento online de servicos
- Comunicacao automatizada via WhatsApp
- Criacao de conteudo para redes sociais com IA

### 1.2 Publico-Alvo
- **Primario:** Donos de saloes de beleza pequenos e medios
- **Secundario:** Profissionais autonomos (manicures, cabeleireiros, esteticistas)
- **Terciario:** Clientes dos saloes (agendamento)

### 1.3 Proposta de Valor
"Automatize seu salao e crie conteudo profissional para redes sociais em minutos, nao em horas."

---

## 2. FUNCIONALIDADES CORE DO MVP

### 2.1 MODULO: Autenticacao e Usuarios

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| AUTH-01 | Registro de usuario | MUST | Cadastro com email, senha, nome, telefone |
| AUTH-02 | Login com JWT | MUST | Autenticacao segura com tokens |
| AUTH-03 | Refresh token | MUST | Renovacao automatica de sessao |
| AUTH-04 | Recuperacao de senha | SHOULD | Reset via email |
| AUTH-05 | Perfil do usuario | MUST | Visualizar e editar dados |
| AUTH-06 | Roles (ADMIN/PROFISSIONAL/CLIENTE) | MUST | Controle de acesso por papel |

### 2.2 MODULO: Gestao do Salao

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| SALON-01 | Cadastro do salao | MUST | Nome, endereco, telefone, logo |
| SALON-02 | Configuracoes do salao | MUST | Horario funcionamento, intervalo entre servicos |
| SALON-03 | Cadastro de profissionais | MUST | Vincular usuarios ao salao |
| SALON-04 | Especialidades por profissional | SHOULD | Servicos que cada um realiza |
| SALON-05 | Horarios de trabalho | MUST | Definir agenda por profissional |

### 2.3 MODULO: Servicos

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| SERV-01 | Cadastro de servicos | MUST | Nome, descricao, preco, duracao |
| SERV-02 | Categorias de servico | SHOULD | Cabelo, unha, maquiagem, etc |
| SERV-03 | Ativar/Desativar servico | MUST | Controle de disponibilidade |
| SERV-04 | Preco variavel por profissional | COULD | Precos diferentes por profissional |

### 2.4 MODULO: Agendamento

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| AGEND-01 | Criar agendamento | MUST | Selecionar servico, profissional, data/hora |
| AGEND-02 | Validacao de conflitos | MUST | Impedir agendamentos sobrepostos |
| AGEND-03 | Listar agendamentos | MUST | Filtrar por data, profissional, status |
| AGEND-04 | Cancelar agendamento | MUST | Com registro de motivo |
| AGEND-05 | Reagendar | MUST | Alterar data/hora mantendo historico |
| AGEND-06 | Bloqueio de horarios | MUST | Ferias, folgas, intervalos |
| AGEND-07 | Confirmacao do cliente | SHOULD | Via link no WhatsApp |
| AGEND-08 | Regra de no-show | SHOULD | Marcar ausencia e penalizar |
| AGEND-09 | Calculo automatico de duracao | MUST | Baseado no servico |
| AGEND-10 | Multiplos servicos | COULD | Agendar varios servicos de uma vez |

### 2.5 MODULO: Clientes

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| CLIENT-01 | Cadastro de clientes | MUST | Nome, telefone, email |
| CLIENT-02 | Historico de agendamentos | MUST | Ver servicos anteriores |
| CLIENT-03 | Contador de no-shows | SHOULD | Controlar faltas |
| CLIENT-04 | Observacoes sobre cliente | COULD | Notas internas |
| CLIENT-05 | Bloqueio de cliente | COULD | Impedir agendamento |

### 2.6 MODULO: WhatsApp

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| WPP-01 | Confirmacao de agendamento | MUST | Mensagem automatica ao agendar |
| WPP-02 | Lembrete 24h | MUST | Notificacao um dia antes |
| WPP-03 | Lembrete 2h | SHOULD | Notificacao duas horas antes |
| WPP-04 | Pos-atendimento | SHOULD | Solicitar avaliacao |
| WPP-05 | Link para cancelar/reagendar | MUST | Acoes via link seguro |
| WPP-06 | Status de entrega | SHOULD | Webhook de confirmacao |

### 2.7 MODULO: Social Studio - Imagens

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| IMG-01 | Upload de imagem | MUST | JPEG, PNG, WebP ate 10MB |
| IMG-02 | Armazenamento S3 | MUST | Storage seguro e escalavel |
| IMG-03 | Melhoria com IA | MUST | Enhance, ajuste de qualidade |
| IMG-04 | Remocao de fundo | MUST | Background removal |
| IMG-05 | Desfoque de fundo | SHOULD | Blur artistico |
| IMG-06 | Upscale | SHOULD | Aumentar resolucao |
| IMG-07 | Crops para redes sociais | MUST | 1:1, 4:5, 9:16, 16:9 |
| IMG-08 | Historico de edicoes | SHOULD | Versionamento |

### 2.8 MODULO: Social Studio - Legendas

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| CAPT-01 | Geracao de legenda com IA | MUST | Baseado no contexto do salao |
| CAPT-02 | Sugestao de hashtags | MUST | Relevantes para o nicho |
| CAPT-03 | Call-to-action | SHOULD | Sugestao de CTA |
| CAPT-04 | Tons de voz | MUST | Profissional, casual, divertido |
| CAPT-05 | Multi-idioma | COULD | PT-BR, EN, ES |
| CAPT-06 | Otimizacao por plataforma | SHOULD | Instagram vs Facebook |

### 2.9 MODULO: Publicacao Social

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| PUB-01 | Conectar Instagram | MUST | OAuth com Meta |
| PUB-02 | Conectar Facebook | MUST | OAuth com Meta |
| PUB-03 | Publicar post | MUST | Enviar para rede social |
| PUB-04 | Agendar publicacao | MUST | Definir data/hora futura |
| PUB-05 | Preview do post | MUST | Visualizar antes de publicar |
| PUB-06 | Status da publicacao | SHOULD | Acompanhar se foi publicado |
| PUB-07 | Metricas basicas | COULD | Curtidas, comentarios |

### 2.10 MODULO: Relatorios

| ID | Funcionalidade | Prioridade | Descricao |
|----|----------------|------------|-----------|
| REL-01 | Agendamentos por periodo | MUST | Total, concluidos, cancelados |
| REL-02 | Faturamento | SHOULD | Total por periodo |
| REL-03 | Taxa de no-show | SHOULD | Percentual de faltas |
| REL-04 | Engajamento social | COULD | Metricas de posts |
| REL-05 | Profissional mais agendado | COULD | Ranking |

---

## 3. FORA DO ESCOPO MVP

As seguintes funcionalidades NAO estao no MVP inicial:

- [ ] Pagamento online integrado (Stripe, PagSeguro)
- [ ] App mobile nativo (iOS/Android)
- [ ] Chatbot WhatsApp conversacional
- [ ] Marketplace de profissionais
- [ ] Programa de fidelidade/pontos
- [ ] Integracao com sistemas de caixa
- [ ] Multi-tenancy completo (white-label)
- [ ] Video editing para Reels/Stories
- [ ] Analytics avancado com IA
- [ ] Integracao com Google Calendar

---

## 4. REQUISITOS NAO-FUNCIONAIS

### 4.1 Performance
- Tempo de resposta API: < 500ms (p95)
- Tempo de processamento IA: < 30s
- Uptime: 99.5%

### 4.2 Seguranca
- Autenticacao JWT com refresh tokens
- HTTPS obrigatorio
- Rate limiting por IP
- Validacao de inputs
- Senhas com hash bcrypt

### 4.3 Escalabilidade
- Suportar 1000 usuarios simultaneos
- Suportar 10.000 agendamentos/dia
- Storage de imagens escalavel (S3)

### 4.4 Compatibilidade
- Frontend: Chrome, Firefox, Safari, Edge (ultimas 2 versoes)
- Mobile: Responsivo para iOS e Android
- API: RESTful com documentacao OpenAPI

---

## 5. METRICAS DE SUCESSO DO MVP

| Metrica | Meta | Prazo |
|---------|------|-------|
| Usuarios cadastrados | 100 | 3 meses |
| Saloes ativos | 20 | 3 meses |
| Agendamentos/mes | 1000 | 3 meses |
| Posts criados com IA | 500 | 3 meses |
| NPS | > 40 | 6 meses |
| Churn rate | < 10% | 6 meses |

---

*Documento: T0.1.1 - Escopo MVP*
*Versao: 1.0*
*Data: 05/02/2026*
