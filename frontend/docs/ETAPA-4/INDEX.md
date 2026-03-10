# ETAPA 4 - Modulo de Agendamento

## Status: CONCLUIDA

---

## Resumo

Implementacao completa do modulo de agendamento do sistema Belezza.ai, incluindo todos os Services, Controllers, validacoes de conflito, calculo de duracao, cancelamento/reagendamento, sistema de avaliacoes, pagamentos, horarios de trabalho, bloqueios e job automatico de no-show.

---

## Services Criados (9 novos)

| Service | Descricao | Metodos Principais |
|---------|-----------|--------------------|
| `SalonService` | Gerenciamento de saloes | criar, buscarPorId, buscarPorAdmin, listarAtivos, atualizar, desativar |
| `ServicoService` | CRUD de servicos do salao | criar, buscarPorId, listarPorSalon, listarPorSalonETipo, atualizar, desativar |
| `ProfissionalService` | Gerenciamento de profissionais | criar, buscarPorId, listarPorSalon, listarPorServico, listarDisponiveisOnline, atualizar, desativar |
| `ClienteService` | Gerenciamento de clientes | criarOuBuscar, buscarPorId, listarPorSalon, listarBloqueados, bloquear, desbloquear |
| `HorarioTrabalhoService` | Horarios de trabalho por dia | criar, listarPorProfissional, atualizar, desativar |
| `BloqueioHorarioService` | Bloqueios de horario (ferias, folga) | criar, listarPorProfissional, listarPorPeriodo, remover |
| `AgendamentoService` | **Core** - Logica de agendamento | criar, confirmar, confirmarPorToken, iniciar, concluir, cancelar, reagendar, marcarNoShow |
| `AvaliacaoService` | Avaliacoes de atendimento | criar, buscarPorAgendamento, listarPorSalon, listarPorProfissional, mediaSalon, mediaProfissional |
| `PagamentoService` | Registro de pagamentos | registrar, buscarPorAgendamento, listarPorSalon, estornar |

---

## Controllers Criados (7 novos)

### SalonController (`/api/salons`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/salons` | ADMIN | Criar salao |
| GET | `/api/salons/meu` | ADMIN | Meu salao |
| GET | `/api/salons/{id}` | Auth | Buscar por ID |
| GET | `/api/salons` | Auth | Listar ativos |
| PUT | `/api/salons/{id}` | ADMIN | Atualizar |
| DELETE | `/api/salons/{id}` | ADMIN | Desativar (soft delete) |

### ServicoController (`/api/servicos`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/servicos` | ADMIN | Criar servico |
| GET | `/api/servicos/{id}` | Auth | Buscar por ID |
| GET | `/api/servicos/salon/{salonId}` | Auth | Listar por salao |
| GET | `/api/servicos/salon/{salonId}/tipo/{tipo}` | Auth | Listar por tipo |
| PUT | `/api/servicos/{id}` | ADMIN | Atualizar |
| DELETE | `/api/servicos/{id}` | ADMIN | Desativar |

### ProfissionalController (`/api/profissionais`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/profissionais` | ADMIN | Cadastrar profissional |
| GET | `/api/profissionais/{id}` | Auth | Buscar por ID |
| GET | `/api/profissionais/salon/{salonId}` | Auth | Listar por salao |
| GET | `/api/profissionais/servico/{servicoId}` | Auth | Listar por servico |
| GET | `/api/profissionais/salon/{salonId}/disponiveis` | Auth | Listar disponiveis online |
| PUT | `/api/profissionais/{id}` | ADMIN | Atualizar |
| DELETE | `/api/profissionais/{id}` | ADMIN | Desativar |

### ClienteController (`/api/clientes`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/api/clientes/{id}` | Auth | Buscar por ID |
| GET | `/api/clientes/salon/{salonId}` | Auth | Listar por salao |
| PATCH | `/api/clientes/{id}/observacoes` | ADMIN | Atualizar observacoes |
| POST | `/api/clientes/{id}/bloquear` | ADMIN | Bloquear cliente |
| POST | `/api/clientes/{id}/desbloquear` | ADMIN | Desbloquear cliente |

### AgendamentoController (`/api/agendamentos`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/agendamentos` | Auth | Criar agendamento |
| GET | `/api/agendamentos/{id}` | Auth | Buscar por ID |
| GET | `/api/agendamentos/salon/{salonId}` | PROF/ADMIN | Listar por salao (paginado) |
| GET | `/api/agendamentos/cliente/{clienteId}` | Auth | Listar por cliente (paginado) |
| GET | `/api/agendamentos/profissional/{profissionalId}` | PROF/ADMIN | Listar por profissional |
| GET | `/api/agendamentos/profissional/{id}/agenda-diaria` | PROF/ADMIN | Agenda do dia |
| POST | `/api/agendamentos/{id}/confirmar` | PROF/ADMIN | Confirmar |
| POST | `/api/agendamentos/{id}/iniciar` | PROF/ADMIN | Iniciar atendimento |
| POST | `/api/agendamentos/{id}/concluir` | PROF/ADMIN | Concluir |
| POST | `/api/agendamentos/{id}/cancelar` | Auth | Cancelar (com motivo) |
| POST | `/api/agendamentos/{id}/reagendar` | Auth | Reagendar |
| POST | `/api/agendamentos/{id}/no-show` | PROF/ADMIN | Marcar no-show |

### PublicAgendamentoController (`/api/public/agendamentos`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/api/public/agendamentos/{token}/confirmar` | Publico | Confirmar via token (link WhatsApp) |

### HorarioController (`/api/profissionais/{profissionalId}`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `.../horarios` | PROF/ADMIN | Criar horario de trabalho |
| GET | `.../horarios` | Auth | Listar horarios |
| PUT | `.../horarios/{diaSemana}` | PROF/ADMIN | Atualizar horario |
| DELETE | `.../horarios/{diaSemana}` | PROF/ADMIN | Desativar horario |
| POST | `.../bloqueios` | PROF/ADMIN | Criar bloqueio |
| GET | `.../bloqueios` | Auth | Listar bloqueios |
| DELETE | `.../bloqueios/{id}` | PROF/ADMIN | Remover bloqueio |

### AvaliacaoController (`/api/avaliacoes`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/avaliacoes` | Auth | Criar avaliacao (1-5 estrelas) |
| GET | `/api/avaliacoes/agendamento/{id}` | Auth | Buscar por agendamento |
| GET | `/api/avaliacoes/salon/{salonId}` | Auth | Listar por salao |
| GET | `/api/avaliacoes/profissional/{id}` | Auth | Listar por profissional |
| GET | `/api/avaliacoes/salon/{salonId}/media` | Auth | Media do salao |
| GET | `/api/avaliacoes/profissional/{id}/media` | Auth | Media do profissional |

### PagamentoController (`/api/pagamentos`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/api/pagamentos` | PROF/ADMIN | Registrar pagamento |
| GET | `/api/pagamentos/agendamento/{id}` | PROF/ADMIN | Buscar por agendamento |
| GET | `/api/pagamentos/salon/{salonId}` | PROF/ADMIN | Listar por salao |
| POST | `/api/pagamentos/{id}/estornar` | PROF/ADMIN | Estornar pagamento |

---

## Scheduler Criado (1 novo)

| Job | Frequencia | Descricao |
|-----|-----------|-----------|
| `NoShowScheduler` | A cada 5 minutos | Marca agendamentos CONFIRMADOS como NO_SHOW quando o horario passou 15min. Incrementa no-show do cliente e bloqueia automaticamente se exceder o limite. |

---

## Validacoes de Agendamento

O `AgendamentoService` implementa as seguintes validacoes:

1. **Salao aceita agendamento online** - Verifica `aceitaAgendamentoOnline` do salao
2. **Profissional aceita agendamento online** - Verifica `aceitaAgendamentoOnline` do profissional
3. **Profissional pertence ao salao** - Valida vinculo profissional-salao
4. **Servico pertence ao salao** - Valida vinculo servico-salao
5. **Cliente nao esta bloqueado** - Verifica `bloqueado` do cliente
6. **Antecedencia minima** - Ex: minimo 2h antes (configuravel por salao)
7. **Horario de funcionamento** - Dentro do horario do salao (abertura-fechamento)
8. **Horario do profissional** - Dentro do expediente do profissional no dia da semana
9. **Intervalo do profissional** - Nao conflita com intervalo de almoco
10. **Bloqueio de horario** - Nao ha bloqueio (ferias, folga) no periodo
11. **Conflito de agendamento** - Nao ha outro agendamento do profissional no horario

---

## Fluxo de Status do Agendamento

```
PENDENTE -> CONFIRMADO -> EM_ANDAMENTO -> CONCLUIDO
    |           |              |
    v           v              v
 CANCELADO   CANCELADO      CANCELADO
                |
                v
             NO_SHOW
```

---

## Regras de Negocio

### Cancelamento
- Respeita antecedencia minima (configuravel por salao, padrao 2h)
- Requer motivo obrigatorio
- Nao permite cancelar agendamentos concluidos, cancelados ou no-show

### Reagendamento
- Valida nova data/hora com todas as regras
- Permite trocar profissional
- Reseta status para PENDENTE
- Reseta flags de lembrete (24h e 2h)

### No-Show
- Job automatico a cada 5 minutos
- Agendamento CONFIRMADO com horario > 15min atras
- Incrementa contador de no-show do cliente
- Bloqueia cliente automaticamente ao atingir limite (configuravel, padrao 3)

### Avaliacao
- Apenas agendamentos CONCLUIDOS podem ser avaliados
- Uma avaliacao por agendamento
- Nota de 1 a 5 estrelas

### Pagamento
- Apenas agendamentos CONCLUIDOS ou EM_ANDAMENTO
- Um pagamento por agendamento
- Suporta estorno

---

## Validacao

- Compilacao: OK (`mvn compile`)
- Package: OK (`mvn package -DskipTests` -> JAR 86MB)
- Startup com H2: OK (JDK 21, profile test)
- Health Check: OK (`GET /api/public/health` -> UP)
- Fluxo E2E testado:
  1. Registrar admin -> OK
  2. Criar salao -> OK
  3. Criar servico -> OK
  4. Registrar profissional -> OK
  5. Cadastrar profissional no salao -> OK
  6. Registrar cliente -> OK
  7. Criar agendamento -> OK (PENDENTE)
  8. Confirmar agendamento -> OK (CONFIRMADO)
  9. Iniciar agendamento -> OK (EM_ANDAMENTO)
  10. Concluir agendamento -> OK (CONCLUIDO)
  11. Registrar pagamento -> OK (PIX, APROVADO)
  12. Criar avaliacao -> OK (5 estrelas)
  13. Media do salao -> OK (5.0)

---

## Arquivos Criados

### Services (9 arquivos)
- `service/SalonService.java`
- `service/ServicoService.java`
- `service/ProfissionalService.java`
- `service/ClienteService.java`
- `service/HorarioTrabalhoService.java`
- `service/BloqueioHorarioService.java`
- `service/AgendamentoService.java`
- `service/AvaliacaoService.java`
- `service/PagamentoService.java`

### Controllers (8 arquivos)
- `controller/SalonController.java`
- `controller/ServicoController.java`
- `controller/ProfissionalController.java`
- `controller/ClienteController.java`
- `controller/HorarioController.java`
- `controller/AgendamentoController.java`
- `controller/AvaliacaoController.java`
- `controller/PagamentoController.java`
- `controller/PublicAgendamentoController.java`

### Scheduler (1 arquivo)
- `scheduler/NoShowScheduler.java`

### Exception (1 arquivo modificado)
- `exception/DuplicateResourceException.java` (adicionado construtor 3 params)

**Total: 19 arquivos criados/modificados**
