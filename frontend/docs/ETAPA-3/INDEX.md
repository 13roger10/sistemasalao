# ETAPA 3 - Modelagem de Dominio

## Status: CONCLUIDA

---

## Resumo

Modelagem completa do dominio do sistema Belezza.ai, incluindo todas as entidades JPA, enums, repositorios, DTOs, e migrations Flyway para o banco de dados PostgreSQL.

---

## Entidades Criadas

### Enums (7 novos)
| Enum | Valores | Descricao |
|------|---------|-----------|
| `StatusAgendamento` | PENDENTE, CONFIRMADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO, NO_SHOW | Status do fluxo de agendamento |
| `TipoServico` | CABELO, UNHA, MAQUIAGEM, ESTETICA, DEPILACAO, BARBA, SOBRANCELHA, MASSAGEM, OUTRO | Tipos de servicos de beleza |
| `FormaPagamento` | DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, VALE | Formas de pagamento aceitas |
| `StatusPagamento` | PENDENTE, APROVADO, RECUSADO, ESTORNADO | Status do pagamento |
| `StatusPost` | RASCUNHO, AGENDADO, PUBLICANDO, PUBLICADO, FALHOU | Status da publicacao social |
| `PlataformaSocial` | INSTAGRAM, FACEBOOK, WHATSAPP_STATUS | Plataformas suportadas |
| `DiaSemana` | SEGUNDA a DOMINGO | Dias da semana para horarios |

### Entidades Core (8 novas)
| Entidade | Tabela | Descricao |
|----------|--------|-----------|
| `Salon` | salons | Salao de beleza (1 admin = 1 salao) |
| `Profissional` | profissionais | Profissional/funcionario do salao |
| `Cliente` | clientes | Cliente vinculado a um salao especifico |
| `Servico` | servicos | Servico oferecido (corte, manicure, etc) |
| `Agendamento` | agendamentos | Agendamento vinculando cliente + profissional + servico |
| `Avaliacao` | avaliacoes | Avaliacao (1-5 estrelas) de um agendamento |
| `Pagamento` | pagamentos | Pagamento de um agendamento |
| `AuditLog` | audit_logs | Log de auditoria para acoes importantes |

### Entidades de Suporte (3 novas)
| Entidade | Tabela | Descricao |
|----------|--------|-----------|
| `HorarioTrabalho` | horarios_trabalho | Horario de trabalho por dia da semana |
| `BloqueioHorario` | bloqueios_horario | Bloqueio de horario (ferias, folga) |
| `ContaSocial` | contas_sociais | Conta de rede social conectada |

### Entidades Social Studio (1 nova)
| Entidade | Tabela | Descricao |
|----------|--------|-----------|
| `Post` | posts | Post para redes sociais (com hashtags e plataformas) |

### Tabelas de Relacionamento (2)
| Tabela | Descricao |
|--------|-----------|
| `profissional_servicos` | N:N entre profissionais e servicos |
| `post_hashtags` | Hashtags de um post |
| `post_plataformas` | Plataformas alvo de um post |

---

## Repositorios JPA (11 novos)

| Repositorio | Queries Customizadas |
|-------------|---------------------|
| `SalonRepository` | findByAdminId, findActiveByCidade, countActive |
| `ProfissionalRepository` | findActiveByServicoId, findOnlineAvailableBySalonId, countActiveBySalonId |
| `ClienteRepository` | findByUsuarioIdAndSalonId, findByNoShowsExceeded, incrementNoShows, incrementTotalAgendamentos |
| `ServicoRepository` | findActiveBySalonIdOrdered, countActiveBySalonId |
| `AgendamentoRepository` | findConflicts, findNeedingReminder24h/2h, findNoShowCandidates, findDailyByProfissional, countByStatusAndPeriod |
| `AvaliacaoRepository` | findAverageNotaBySalonId, findAverageNotaByProfissionalId |
| `PagamentoRepository` | sumFaturamentoBySalonIdAndPeriod, sumByFormaPagamentoAndPeriod, avgTicketMedio |
| `PostRepository` | findReadyToPublish, findRetryable, countByStatusAndPeriod, sumEngagementBySalonIdAndPeriod |
| `ContaSocialRepository` | findWithExpiringTokens, countActiveBySalonIdAndPlataforma |
| `HorarioTrabalhoRepository` | findByProfissionalIdAndDiaSemana |
| `BloqueioHorarioRepository` | findConflicts, findByProfissionalIdAndPeriod |
| `AuditLogRepository` | findByEntidadeAndEntidadeId, findByUsuarioId |

---

## DTOs Criados (22 novos)

### Salon
- `SalonRequest` - Criacao/atualizacao de salao
- `SalonResponse` - Resposta com dados do salao

### Profissional
- `ProfissionalRequest` - Criacao/atualizacao de profissional
- `ProfissionalResponse` - Resposta com dados do profissional (inclui servicos)

### Servico
- `ServicoRequest` - Criacao/atualizacao de servico
- `ServicoResponse` - Resposta com dados do servico

### Agendamento
- `AgendamentoRequest` - Criacao de agendamento
- `AgendamentoResponse` - Resposta com dados completos do agendamento
- `CancelamentoRequest` - Cancelamento com motivo
- `ReagendamentoRequest` - Reagendamento com nova data

### Cliente
- `ClienteResponse` - Resposta com dados do cliente

### Avaliacao
- `AvaliacaoRequest` - Criacao de avaliacao (nota 1-5)
- `AvaliacaoResponse` - Resposta com dados da avaliacao

### Pagamento
- `PagamentoRequest` - Registro de pagamento
- `PagamentoResponse` - Resposta com dados do pagamento

### Post
- `PostRequest` - Criacao/atualizacao de post
- `PostResponse` - Resposta com dados do post e metricas

### Horario/Bloqueio
- `HorarioTrabalhoRequest` - Definicao de horario de trabalho
- `HorarioTrabalhoResponse` - Resposta com horario de trabalho
- `BloqueioHorarioRequest` - Criacao de bloqueio de horario
- `BloqueioHorarioResponse` - Resposta com dados do bloqueio

---

## Flyway Migrations (6 novas)

| Migration | Descricao |
|-----------|-----------|
| `V3__create_salon_tables.sql` | Salons, servicos, profissionais, profissional_servicos, horarios_trabalho, bloqueios_horario |
| `V4__create_scheduling_tables.sql` | Clientes, agendamentos, avaliacoes |
| `V5__create_payment_tables.sql` | Pagamentos |
| `V6__create_social_tables.sql` | Contas sociais, posts, post_hashtags, post_plataformas |
| `V7__create_audit_log_table.sql` | Audit logs |
| `V8__seed_initial_data.sql` | Dados iniciais (salao demo + 10 servicos de exemplo) |

---

## Diagrama de Relacionamentos

```
Usuario (1) -----> (1) Salon (admin)
Usuario (1) -----> (1) Profissional
Usuario (1) -----> (N) Cliente (por salao)

Salon (1) -----> (N) Profissional
Salon (1) -----> (N) Servico
Salon (1) -----> (N) Post
Salon (1) -----> (N) ContaSocial

Profissional (N) <----> (N) Servico (profissional_servicos)
Profissional (1) -----> (N) HorarioTrabalho
Profissional (1) -----> (N) BloqueioHorario

Cliente (1) -----> (N) Agendamento
Profissional (1) -----> (N) Agendamento
Servico (1) -----> (N) Agendamento

Agendamento (1) -----> (1) Avaliacao
Agendamento (1) -----> (1) Pagamento

Post (1) -----> (N) Hashtags
Post (1) -----> (N) Plataformas
```

---

## Dados de Seed (V8)

### Salao Demo
- **Nome**: Belezza Studio Demo
- **Endereco**: Rua das Flores, 123 - Centro, Sao Paulo/SP
- **Horario**: 08:00 - 20:00
- **Admin**: admin@belezza.ai

### Servicos de Exemplo (10)
| Servico | Preco | Duracao | Tipo |
|---------|-------|---------|------|
| Corte Feminino | R$ 80,00 | 60 min | CABELO |
| Corte Masculino | R$ 45,00 | 30 min | CABELO |
| Coloracao | R$ 150,00 | 120 min | CABELO |
| Escova Progressiva | R$ 200,00 | 180 min | CABELO |
| Manicure | R$ 35,00 | 45 min | UNHA |
| Pedicure | R$ 40,00 | 50 min | UNHA |
| Maquiagem Social | R$ 120,00 | 60 min | MAQUIAGEM |
| Limpeza de Pele | R$ 90,00 | 75 min | ESTETICA |
| Design de Sobrancelha | R$ 30,00 | 20 min | SOBRANCELHA |
| Barba | R$ 35,00 | 30 min | BARBA |

---

## Validacao

- Compilacao: OK (mvn compile)
- Startup com H2: OK (todas as 16 tabelas criadas)
- Health Check: OK (`GET /api/public/health` -> UP)
- Total de tabelas: 16 (incluindo tabelas de relacionamento)
- Total de arquivos Java criados: 40+
