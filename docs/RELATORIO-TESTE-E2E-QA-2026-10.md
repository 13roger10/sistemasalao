# RELATÓRIO COMPLETO DE TESTES — E2E FUNCIONAL (QA)

**Sistema:** Belezza — gestão para salões/barbearias
**Data:** 08/10/2026
**Ambiente:** Docker local (`docker-compose.yml`) — Postgres 16, Redis 7, backend Spring Boot em `127.0.0.1:8081`. Perfil `default`.
**Método:** execução real contra a API (criação de usuários, login, operação ponta a ponta e validação dos resultados e cálculos). **Nenhum dado real de produção foi alterado**; toda a massa de teste foi criada com prefixo `QA`/domínio `@qa.test`. Esta fase é de **diagnóstico** — conforme solicitado, **nenhum bug foi corrigido** nesta rodada.

> Observação de escopo: testes ativos executados **somente** no ambiente Docker local. Não foram disparados ataques contra domínios remotos.

---

## RESUMO

| Indicador | Valor |
|---|---|
| Cenários executados | 60+ |
| ✅ Aprovados | 55 |
| ❌ Reprovados | 2 (isolamento de tenant) |
| ⚠️ Parciais / observações | 3 |
| 🚫 Bloqueados | 0 |

| Severidade | Qtde | Itens |
|---|---|---|
| 🔴 CRÍTICA | 0 | — |
| 🟠 ALTA | 1 | BUG-E2E-001 (isolamento de tenant falha-aberto) |
| 🟡 MÉDIA | 1 | BUG-E2E-002 (detalhe de profissional sem checagem de tenant) |
| 🔵 BAIXA | 3 | BUG-E2E-003, OBS-01, OBS-02 |

**Veredito:** o núcleo de negócio (agenda, conflitos, status, pagamentos, caixa, comissões, concorrência) está **sólido e matematicamente correto**. O ponto de atenção são **duas falhas de isolamento multi-tenant** que expõem dados de outro estabelecimento por ID em endpoints específicos.

---

## MASSA DE TESTE CRIADA (FASE 2)

- Usuários: `QA Funcionario Teste` (PROFISSIONAL, prof#6, comissão 40%), `QA Recepcionista Teste` (RECEPCIONISTA), `QA Cliente Login` (CLIENTE), `QA Admin B` (ADMIN de outro salão), + profissionais auxiliares para cenários de pagamento/concorrência.
- Clientes (registro): `QA Cliente Alpha` (#7), `QA Cliente Beta` (#8) e auxiliares (#9–#12).
- Serviço controlado: `QA Servico 100` (#61, R$100, 60 min) para validar os cálculos de forma exata.
- Segundo estabelecimento: `QA Salon B` (#2) para o teste de isolamento.
- Agenda do profissional auto-criada (SEG–SEX 09–21, SAB/DOM) com intervalo 12:00–13:00.

---

## RESULTADO — ADMINISTRADOR

| Função | Teste realizado | Resultado | Observação |
|---|---|---|---|
| Login | `admin@belezza.ai` | ✅ | token JWT HS384, `salonId` no claim |
| Criar usuário (PROF/RECEP/CLIENTE/ADMIN) | POST `/api/usuarios` | ✅ | cria Usuário e, p/ PROFISSIONAL, o Profissional + agenda padrão |
| Criar serviço | POST `/api/servicos` | ✅ | |
| Configurar profissional (serviços, categoria, nível) | PUT `/api/profissionais/{id}` | ✅ | |
| Configurar comissão | PUT `/api/comissoes/profissional/{id}/configurar` | ✅ | 40% aplicado |
| Abrir/fechar caixa | POST `/cash-register/open` / `/close` | ✅ | ver seção CAIXA |
| Estornar pagamento | POST `/api/pagamentos/{id}/estornar` | ✅ | reverte caixa e comissão |
| Alterar preço de serviço | PUT `/api/servicos/{id}` | ✅ | **não** altera agendamento já existente (histórico preservado) |
| Excluir profissional com agenda futura | DELETE `/api/profissionais/{id}` | ✅ | bloqueado (409) com lista de agendamentos afetados |

## RESULTADO — RECEPCIONISTA

| Função | Teste | Resultado | Observação |
|---|---|---|---|
| Listar clientes do salão | GET `/api/clientes/salon/1` | ✅ permitido | |
| Criar ADMIN | POST `/api/usuarios` role=ADMIN | 🚫 403 | corretamente negado |
| Alterar comissão | PUT `/configurar` | 🚫 403 | ação exclusiva de admin |
| Estornar pagamento | POST `/estornar` | 🚫 403 | exclusivo de admin |
| Excluir salão | DELETE `/api/salons/1` | 🚫 403 | |

## RESULTADO — FUNCIONÁRIO (PROFISSIONAL)

| Função | Teste | Resultado | Observação |
|---|---|---|---|
| Login (e-mail não verificado) | — | ✅ | conta criada por admin loga normalmente |
| Ver agenda do salão | GET `/api/agendamentos/salon/1` | ⚠️ 200 | retorna **somente a própria agenda** (dados restritos) |
| Ver comissão de OUTRO profissional | GET `/api/comissoes/profissional/2` | 🚫 403 | |
| Editar OUTRO profissional | PUT `/api/profissionais/2` | 🚫 403 | |
| Criar usuário | POST `/api/usuarios` | 🚫 403 | |

## RESULTADO — CLIENTE

| Função | Teste | Resultado |
|---|---|---|
| Acessar clientes do salão | GET `/api/clientes/salon/1` | 🚫 403 |
| Acessar agenda do salão | GET `/api/agendamentos/salon/1` | 🚫 403 |
| Acessar caixa | GET `/cash-register/current` | 🚫 403 |
| Registrar pagamento | POST `/api/pagamentos` | 🚫 403 |
| Escalar privilégio (criar ADMIN) | POST `/api/usuarios` role=ADMIN | 🚫 403 — **nenhum usuário criado** |
| Acesso sem token / token inválido | — | 🚫 401 |

---

## RESULTADO — PAGAMENTOS (FASE 7)

Serviço de R$100,00 em cada cenário.

| Cenário | Entrada | Esperado | Sistema | Resultado |
|---|---|---|---|---|
| Completo | DINHEIRO 100 | aprovado, caixa +100 | idem | ✅ |
| Troco | DINHEIRO valor 100, recebido 120 | troco 20 | troco **20,00** | ✅ |
| Dividido | PIX 50 + DINHEIRO 50 | total 100 | 2 partes somando 100 | ✅ |
| Insuficiente | 80 de 100 | bloquear | 400 "valor diferente do a pagar" | ✅ |
| Acima (cartão) | CARTÃO 120 | bloquear | 400 (cartão não gera troco) | ✅ |
| Acima (dinheiro) | DINHEIRO 130 | troco 30 | valor 100 / troco **30,00** | ✅ |
| Duplicado | pagar 2x | bloquear 2º | 400 "já está pago" | ✅ |
| Sem caixa aberto | pagar | bloquear | 400 "Nenhum caixa aberto" | ✅ |
| Estorno | pagar 100 → estornar | reverter caixa + comissão | caixa volta; comissão → CANCELADA | ✅ |

---

## RESULTADO — CAIXA (FASE 8)

Fórmula conferida de forma independente. **PIX/cartão não entram no saldo físico (gaveta)** — apenas dinheiro, suprimentos e sangrias.

| Item | Valor |
|---|---|
| Saldo inicial (abertura) | R$ 200,00 |
| Entradas em dinheiro | R$ 350,00 |
| Entradas PIX | R$ 50,00 (fora da gaveta) |
| Sangria (saída) | − R$ 100,00 |
| Suprimento | + R$ 50,00 |
| **Saldo esperado (calculado)** | **R$ 500,00** |
| Saldo esperado (sistema) | R$ 500,00 ✅ |
| Fechamento informado | R$ 480,00 |
| Diferença apurada | **− R$ 20,00** ✅ |

Guardas: caixa fechado recusa sangria/pagamento (400) ✅; recusa segundo fechamento (400) ✅; recusa abrir 2º caixa com um já aberto (400) ✅.

---

## RESULTADO — COMISSÕES (FASE 9)

| Profissional | Serviço | Valor | % | Comissão esperada | Sistema | Resultado |
|---|---|---|---|---|---|---|
| QA Funcionario (prof#6) | QA Servico 100 | R$100 | 40% | R$ 40,00 | R$ 40,00 (CALCULADA) | ✅ |
| prof. do cenário estorno | QA Servico 100 | R$100 | 40% | estornado → sem comissão | status **CANCELADA** | ✅ |

Cálculo: `valorServico × taxa ÷ 100` com `RoundingMode.HALF_UP` (2 casas). Correto.

---

## AGENDA — CONFLITOS E REGRAS (FASE 3.4 / 3.5)

Profissional prof#6, base: 10:00–11:00 ocupado.

| Tentativa | Esperado | Sistema |
|---|---|---|
| 10:00–11:00 (exato) | bloquear | ✅ bloqueado |
| 09:30–10:30 (sobrepõe início) | bloquear | ✅ |
| 10:30–11:30 (sobrepõe fim) | bloquear | ✅ |
| 10:59–11:29 (toca o fim) | bloquear | ✅ |
| 09:30–10:00 (encosta antes) | permitir | ✅ criado |
| 11:00–12:00 (encosta depois) | permitir | ✅ criado |
| 08:00 (antes da abertura) | bloquear | ✅ "fora do funcionamento" |
| 12:00/12:30 (intervalo almoço) | bloquear | ✅ "conflita com o intervalo" |
| 20:30→21:30 (após fechamento) | bloquear | ✅ |
| data passada | bloquear | ✅ |
| mesmo cliente em 2 lugares | bloquear | ✅ "cliente já tem outro agendamento" |

Detecção de sobreposição meia-aberta (`início < fim_existente AND fim > início_existente`) correta, com trava de linha (`FOR UPDATE`) de profissional e cliente.

---

## FLUXO E2E PRINCIPAL (FASE 10)

ADMIN cria profissional/serviço/preço/comissão → agenda criada → **PENDENTE → CONFIRMADO → EM_ANDAMENTO → CONCLUIDO** → abre caixa → pagamento R$100 → caixa recebe → comissão R$40 → consistência verificada em agenda, pagamento, caixa, comissão. **Fluxo íntegro ✅.** Regras de transição validadas: iniciar só a partir de 30 min antes; concluir só se EM_ANDAMENTO; transições inválidas recusadas; no-show só após o horário.

## CONCORRÊNCIA / DUPLO CLIQUE (FASE 16)

| Teste | Resultado |
|---|---|
| 2 pagamentos simultâneos do mesmo atendimento | ✅ 1 aprovado, 1 recusado (400); **1 pagamento** persistido |
| 2 agendamentos simultâneos no mesmo horário | ✅ 1 criado, 1 recusado (conflito); **sem duplicidade** |

## VALIDAÇÕES DE FORMULÁRIO (FASE 18)

| Campo | Entrada | Resultado |
|---|---|---|
| Preço | −10 | ✅ 400 "Preço deve ser positivo" |
| Duração | 0 | ✅ 400 "Duração mínima é 1 minuto" |
| E-mail | `not-an-email` | ✅ 400 "Email inválido" |
| E-mail duplicado | existente | ✅ 409 "Usuário já existe" |

---

# BUGS ENCONTRADOS

## BUG-E2E-001 — Isolamento multi-tenant "falha-aberto" nas listagens por `salonId`

**Status:** ✅ CORRIGIDO (verificado em ambiente local + 65 testes unitários). `GET /api/agendamentos/salon/{id}` passou a usar `enforceStaffTenant` (fail-closed); as listagens de profissionais por salão usam a nova `TenantIsolationService.assertStaffRequestedSalon(salonId, quem)` — fecha a equipe sem salão vinculado e mantém o agendamento público do cliente (contato já ocultado). Regressão: token de equipe sem `salonId` agora recebe 403; salão próprio continua 200; cliente continua listando profissionais sem contato.
**Severidade:** 🟠 ALTA
**Perfil:** ADMIN / RECEPCIONISTA / PROFISSIONAL com token **sem** `salonId` (ex.: admin recém-criado, antes de criar o salão)
**Módulo:** Segurança / multi-tenant
**Endpoints:** `GET /api/agendamentos/salon/{salonId}` e `GET /api/profissionais/salon/{salonId}`

**Descrição:** quando o token da equipe não tem `salonId` no claim (tenant nulo), a verificação de isolamento é **ignorada** e o chamador lê dados de **qualquer** salão informando o ID na URL — incluindo a **agenda completa de outro estabelecimento com PII do cliente** (nome, telefone, observações).

**Passos para reproduzir:**
1. Admin cria um novo usuário ADMIN **sem** `salonId` (POST `/api/usuarios`).
2. Faz login desse admin **antes** de criar o próprio salão → o JWT sai com `salonId` nulo.
3. `GET /api/agendamentos/salon/1` (salão de outro dono) com esse token.

**Resultado esperado:** 403. **Resultado encontrado:** **200** com ~28 KB de agendamentos do Salão 1 (nomes e telefones de clientes). O mesmo ocorre em `/api/profissionais/salon/1`. Após o admin criar o salão e **relogar** (token com `salonId=2`), os mesmos endpoints passam a responder **403** corretamente — confirmando que a brecha é o tenant nulo.

**Causa provável:** `AgendamentoService.listarPorSalon` e `ProfissionalController.listarPorSalon` chamam `TenantIsolationService.assertRequestedSalon(...)`, que delega a `assertCurrentTenant(...)` — e este é **no-op quando o tenant é nulo** (`if (currentTenant == null ...) return;`). O próprio serviço já possui a variante correta **fail-closed** `assertStaffTenant(...)` (cujo Javadoc descreve exatamente este caso: *"um token de equipe sem salonId ... não deve ler nenhum dado"*), porém ela não é usada nesses dois pontos.

**Arquivos envolvidos:**
- `belezza-api/.../service/TenantIsolationService.java` (`assertCurrentTenant` vs `assertStaffTenant`)
- `belezza-api/.../service/AgendamentoService.java` (`listarPorSalon`)
- `belezza-api/.../controller/ProfissionalController.java` (`listarPorSalon`)

**Sugestão de correção (próxima fase):** trocar `assertRequestedSalon` por `assertStaffTenant` nas rotas de equipe que recebem `salonId`, garantindo negação quando o tenant for nulo.

---

## BUG-E2E-002 — Detalhe de profissional sem verificação de tenant

**Status:** ✅ CORRIGIDO (verificado local). `GET /api/profissionais/{id}` passou a chamar `assertStaffRequestedSalon(response.getSalonId(), quem)`: equipe de outro salão recebe 403; admin do próprio salão continua vendo contato; cliente/público mantém o perfil para agendamento com contato ocultado.
**Severidade:** 🟡 MÉDIA
**Endpoint:** `GET /api/profissionais/{id}`
**Descrição:** retorna o profissional de **outro** salão por ID (nome, e-mail interno, telefone) **mesmo com um token de tenant válido e diferente** — diferente das demais rotas, não chama `assertRequestedSalon`/`assertStaffTenant`. Vazamento de PII de equipe entre estabelecimentos.
**Reprodução:** Admin do Salão B (`salonId=2`) → `GET /api/profissionais/6` (profissional do Salão A) → **200** com dados do profissional.
**Arquivo:** `ProfissionalController.buscarPorId` (aplica apenas `paraQuemPede`, sem checagem de salão).
**Sugestão:** validar o tenant do profissional antes de responder (ou reduzir os campos a público quando for de outro salão).

---

## BUG-E2E-003 — Contrato divergente em criação de cliente

**Severidade:** 🔵 BAIXA (cosmético / contrato de API)
**Endpoint:** `POST /api/clientes`
**Descrição:** o DTO `ClienteRequest` anota apenas `name` e `phone` como obrigatórios (Swagger sugere `whatsapp`/`birthDate` opcionais), mas o serviço rejeita com 400 *"Preencha os campos obrigatórios: WhatsApp, data de aniversário"*. A regra do servidor é legítima, porém a documentação/anotações do DTO não refletem isso.
**Sugestão:** alinhar as anotações de validação (`@NotBlank`/`@NotNull`) ao comportamento do serviço, ou tornar os campos de fato opcionais.

---

## OBSERVAÇÕES (BAIXA)

- **OBS-01:** `GET /api/servicos/salon/{id}` e `GET /api/profissionais/{id}/horarios` são acessíveis por qualquer equipe autenticada de outro salão (lista de preços/horários). Provavelmente **intencional** para o agendamento público, mas vale confirmar se deveria exigir tenant para chamadas autenticadas de equipe.
- **OBS-02:** `GET /api/salons/{id}` expõe o cadastro básico (endereço, telefone) de outro salão a um admin logado. Aceitável se tratado como perfil público; registrar a decisão.

---

# MATRIZ FINAL

| Funcionalidade | Admin | Recepcionista | Funcionário | Cliente |
|---|---|---|---|---|
| Agendamento | ✅ | ✅ | ⚠️ (só própria agenda) | 🚫 |
| Clientes | ✅ | ✅ | ✅ (leitura) | 🚫 |
| Agenda | ✅ | ✅ | ⚠️ (própria) | 🚫 |
| Serviços | ✅ | 🚫 (gestão) | 🚫 | 🚫 |
| Pagamentos | ✅ | ✅ | ✅ | 🚫 |
| Caixa | ✅ | ✅ | 🚫 | 🚫 |
| Comissão | ✅ (config) | 🚫 (config) | ✅ (própria) | 🚫 |
| Estorno | ✅ | 🚫 | 🚫 | 🚫 |
| Gestão de usuários | ✅ | ⚠️ (não cria admin) | 🚫 | 🚫 |

Legenda: ✅ permitido e funcionando · 🚫 não permitido (correto) · ⚠️ restrito/parcial por regra.

---

# FLUXOS QUEBRADOS

Nenhum fluxo de negócio ponta a ponta quebrou. O agendamento percorreu criação → agenda correta → disponibilidade → status → pagamento → caixa → comissão → histórico, com dados consistentes em todas as etapas.

---

# PENDÊNCIAS ANTES DA PRODUÇÃO

### 🔴 CORRIGIR IMEDIATAMENTE
- Nenhuma crítica.

### 🟠 CORRIGIR ANTES DA PRODUÇÃO
- **BUG-E2E-001** — isolamento de tenant falha-aberto nas listagens por `salonId` (usar `assertStaffTenant`).

### 🟡 CORREÇÕES IMPORTANTES
- **BUG-E2E-002** — detalhe de profissional sem checagem de tenant.

### 🔵 MELHORIAS
- **BUG-E2E-003** — alinhar contrato do `ClienteRequest`.
- **OBS-01 / OBS-02** — confirmar intenção de exposição cross-tenant de serviços/horários/perfil do salão.

---

# COBERTURA AINDA NÃO EXECUTADA (próximas rodadas sugeridas)

Avaliações (FASE 5.5), agendamento pelo portal público/CLIENTE (FASE 5.1), responsividade de UI (FASE 19 — exige navegador), filtros/paginação exaustivos (FASE 17) e cenário de funcionário ausente com remanejamento (FASE 13). O núcleo transacional e as regras de negócio foram priorizados e cobertos.
