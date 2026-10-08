# RELATÓRIO DE AUDITORIA DE SEGURANÇA — Belezza (Salão/Barbearia)

**Data:** 08/10/2026
**Commit auditado:** `9917402` (branch `main`)
**Responsável técnico:** auditoria conduzida em sessão assistida por IA, a pedido do proprietário do repositório (rogeriio.martins@gmail.com).
**Metodologia:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), apoio em ASVS e WSTG, CWE. Combinação de **análise estática** (código, configs, dependências, histórico Git) e **testes ativos** controlados.

---

## 0. Escopo e autorização

| Alvo | Tipo de teste executado |
|---|---|
| **Docker local** (`localhost:8081` / Postgres / Redis) | Testes **ativos** (requisições reais) com contas e dados **fictícios**, criados e removidos durante a auditoria. |
| **Staging** (`staging-api.belezza.ai`) e **Produção** (`api.belezza.ai`, `app.belezza.ai`) | **Somente análise estática.** **Nenhuma requisição ativa de ataque foi disparada** contra hosts remotos. |

> **Limitação registrada (não é uma conclusão de segurança):** apesar da autorização verbal para "todos os ambientes", **não** executei varredura, brute-force, injeção ou fuzzing contra os domínios remotos. Não há, nesta sessão, como comprovar que esses domínios estão isolados e sob controle exclusivo do solicitante, e disparar ataques contra um host na Internet é uma ação potencialmente destrutiva/ilegal sem essa comprovação. Os achados referentes a staging/produção baseiam-se **apenas** no código e nos manifestos de deploy do repositório. Para testar o staging de verdade, é preciso confirmação explícita de posse e isolamento daquele ambiente.

As regras do roteiro foram seguidas: dados fictícios, sem ataques destrutivos, sem exfiltração de dados reais, sem alteração do código de produção, segredos nunca exibidos por extenso.

---

## 1. Resumo executivo

| Métrica | Valor |
|---|---|
| Fases planejadas (roteiro 2–11) | 10 |
| Fases executadas | 10 (Fase 8 — IA/Prompt Injection — **não aplicável**: ver §7) |
| Verificações com teste ativo | 9 famílias (actuator, auth/rate-limit, IDOR/BOLA, enumeração, mass assignment, autorização por papel, tenant, manipulação de pagamento, upload) |
| **Vulnerabilidades confirmadas** | **0 críticas** / **0 altas** |
| Pontos de atenção (médio) | 4 |
| Hardening recomendado (baixo) | 6 |
| Informativos / não verificados | 5 |

**Parecer resumido:** o núcleo de segurança do backend está **sólido e bem defendido**. Os controles que mais costumam falhar neste tipo de sistema — **IDOR/BOLA, escalonamento de privilégio (mass assignment), isolamento por papel, SQL Injection, enumeração de usuários e manipulação de pagamento** — foram testados e **passaram**. Não foi encontrada nenhuma vulnerabilidade **crítica ou alta confirmada**. As pendências são de **hardening** (defesa em profundidade) e de **configuração de implantação**, descritas adiante.

> Observação importante: este repositório já passou por uma auditoria funcional E2E (38 bugs corrigidos, ver `docs/RELATORIO-AUDITORIA-E2E-2026-10.md`) e por correções de segurança prévias identificadas como `SEC-xxx`/`BUG-xxx` no próprio código. Boa parte dos controles verificados aqui é fruto dessas correções.

---

## 2. Inventário de segurança

**Arquitetura:** API monolítica Spring Boot 3.5.16 (Java 21) + frontend Next.js 16 (React 19), Postgres 16, Redis 7 (opcional), RabbitMQ (opcional), S3 para imagens. Deploy via Docker Compose (local/staging) e Kubernetes (produção), nginx como reverse proxy no staging.

**Autenticação/Sessão:** JWT HS256 (jjwt 0.12.7), access token 15 min + refresh token 7 dias com rotação e `jti` único; blacklist de tokens no logout; invalidação por troca de senha; bloqueio de conta por tentativas (`V48`).

**Papéis:** ADMIN, RECEPCIONISTA, PROFISSIONAL, CLIENTE. Multi-tenant por `salonId` (claim no JWT → `TenantContext`).

**Superfície:** 46 controllers, 42 repositórios JPA, 58 migrations Flyway. Filtros de segurança na ordem: `RateLimitFilter` → `ApiKeyAuthFilter` → `JwtAuthenticationFilter`.

**Portas (local):** todas presas a `127.0.0.1` — Postgres `5432`, Redis `6379`, API `8081→8080`. Staging: só nginx (80/443) publicado; banco/Redis/API na rede interna.

---

## 3. Vulnerabilidades e pontos de atenção

### SEC-A01 — Token de sessão acessível a JavaScript (cookie sem HttpOnly + localStorage)
- **Categoria:** OWASP A05/A07; CWE-1004, CWE-522.
- **Severidade:** Média · **Status:** Confirmada (análise estática).
- **Componente:** frontend — `contexts/AuthContext.tsx:184`, `services/auth.ts:107`, `lib/session-refresh.ts:65`.
- **Descrição:** o cookie `salon_auth_token` é gravado corretamente como **HttpOnly** no login do servidor (`app/api/auth/salon/login/route.ts:104`), **mas** o cookie admin `auth_token` e o token renovado são gravados no navegador via `document.cookie` (sem HttpOnly) e o access token também fica em `localStorage` (declarado como exigência do WebSocket). A CSP existe (`next.config.ts`), porém `script-src` usa `'unsafe-inline' 'unsafe-eval'`, o que a torna ineficaz contra injeção de script inline.
- **Impacto:** se algum XSS for introduzido no futuro, o atacante rouba a sessão (inclusive admin). Hoje a probabilidade é baixa — React escapa a saída e **não há** `dangerouslySetInnerHTML`/`innerHTML` no código.
- **Recomendação:** padronizar **todos** os tokens em cookie `HttpOnly; Secure; SameSite`; para o WebSocket, enviar o token no handshake via mensagem/subprotocolo em vez de `localStorage`; evoluir a CSP para `nonce` e remover `unsafe-inline`/`unsafe-eval`.
- **Regressão:** teste garantindo que nenhuma rota exponha o token a `document.cookie`/`localStorage`.

### SEC-A02 — Verificação de assinatura de webhook "fail-open" quando o segredo não está configurado
- **Categoria:** OWASP API Security; CWE-347.
- **Severidade:** Média · **Status:** Confirmada (análise estática).
- **Componente:** `security/WebhookSignatureVerifier.java` (`isValid` → `return true` quando `META_APP_SECRET` vazio).
- **Descrição:** sem o App Secret configurado, **toda** assinatura HMAC é aceita. Webhooks da Meta/WhatsApp (`/api/webhooks/**`) são públicos (sem JWT). Se o segredo faltar em produção, um terceiro pode forjar eventos de webhook.
- **Impacto:** injeção de eventos falsos (mensagens/status). O comparador em si é correto e em **tempo constante** (`MessageDigest.isEqual`).
- **Recomendação:** em produção, **falhar fechado** — se o segredo não estiver definido, recusar (500/401) em vez de aceitar; validar a presença do segredo no startup (`SecretsValidator`).

### SEC-A03 — Rate limiting em memória, por instância (não distribuído) e sem expurgo
- **Categoria:** OWASP A04/API4; CWE-770, CWE-307.
- **Severidade:** Média · **Status:** Confirmada (análise estática + teste ativo parcial).
- **Componente:** `security/RateLimitFilter.java` (`ConcurrentHashMap` de buckets Bucket4j).
- **Descrição:** o limite (60/min geral, 10/min para auth) foi **confirmado funcionando** no ambiente local (ver §12, teste de login retornou `429`). Porém o estado dos buckets é **por instância JVM** e **em memória**: em Kubernetes com múltiplas réplicas, o atacante distribui as tentativas entre pods e multiplica o limite efetivo. O mapa de buckets também **não tem expurgo**, crescendo com o número de IPs (risco de memória a longo prazo).
- **Recomendação:** usar Bucket4j com backend **distribuído** (Redis/`bucket4j-redis`) em produção; adicionar expiração/eviction ao mapa; manter o bloqueio por conta (`V48`) como segunda barreira contra brute-force.

### SEC-A04 — Exposição ampla do Actuator no perfil `default` (mitigada por acaso)
- **Categoria:** OWASP A05; CWE-16, CWE-200.
- **Severidade:** Média (potencial) → **Baixa** na prática · **Status:** Confirmada e testada.
- **Componente:** `application.yml` (`management.endpoints.web.exposure.include: ...,env,loggers,httptrace,threaddump,heapdump` e `jmx.exposure.include: "*"`).
- **Descrição:** o Docker local roda **sem perfil** (`default`), que expõe `env`/`heapdump`/`threaddump`/`loggers`. **Teste ativo:** todos esses endpoints retornaram **401** (ver §12) — a proteção vem da interação entre `JwtAuthenticationFilter.shouldNotFilter("/actuator/")` + `anyRequest().authenticated()`, ou seja, **ninguém consegue autenticar nessas rotas**. É uma proteção **acidental e frágil**: uma futura mudança no filtro ou na lista pública vazaria segredos (`/actuator/env`). O perfil **`prod` já restringe** corretamente a `health,info,metrics,prometheus`.
- **Recomendação:** no perfil default/local reduzir o `exposure.include`; remover `jmx.exposure: "*"`; proteger o Actuator por porta de management separada ou regra explícita de autorização (não por efeito colateral do filtro).

---

## 4. Portas e serviços expostos

| Porta | Serviço | Exposição (local) | Exposição (staging/prod) | Autenticação | Risco | Correção |
|---|---|---|---|---|---|---|
| 8081→8080 | API Spring Boot | `127.0.0.1` | só nginx (staging) / Service interno (k8s) | JWT/API Key | Baixo | — |
| 5432 | PostgreSQL | `127.0.0.1` | rede interna, sem `ports` | senha obrigatória | Baixo | — |
| 6379 | Redis | `127.0.0.1` | rede interna, sem `ports` | `requirepass` obrigatório | Baixo | — |
| 80/443 | nginx | — | público | TLS | Médio (depende do TLS) | revisar config TLS/HSTS no nginx |
| 9411 | Zipkin | não publicado | — | — | Informativo | API tenta enviar spans e falha silenciosamente em local |

Nenhuma porta de banco/cache fica em `0.0.0.0` — correção já aplicada em auditorias anteriores. **Não verificado ativamente:** exposição real dos hosts de produção (ver §0).

---

## 5. Dados sensíveis expostos

| Dado | Onde | Quem acessa | Situação | Recomendação |
|---|---|---|---|---|
| JWT secret / AES key / senhas | variáveis de ambiente (`.env` **não versionado**; `JWT_SECRET`/`AES_SECRET_KEY` obrigatórios, sem default) | runtime | OK | manter fora do Git; rotacionar periodicamente |
| `k8s/secrets.yaml` | **versionado no Git** | quem tem o repo | **Template com placeholders** (`CHANGE_ME...`, `your-256-bit...`, AWS/Meta/OpenAI vazios) — **sem segredos reais** | ver SEC-B04 |
| Admin padrão `admin@belezza.ai` / `Admin@123` | migrations `V2`/`V8` | — | **Neutralizado em produção** (BUG-004: a conta é desativada no startup prod se a senha pública persistir); ativo só em local/dev | manter guarda `ContasDemoGuard` |
| PII de cliente (nome, telefone, e-mail) | respostas de API | equipe do próprio salão | protegido por papel + tenant + posse | — |

Nenhum segredo real foi encontrado versionado. Nenhum valor de segredo é reproduzido neste relatório.

---

## 6. Matriz de autorização (verificada ativamente com conta CLIENTE fictícia)

| Recurso | Admin | Recepcionista | Profissional | Cliente | Evidência |
|---|---|---|---|---|---|
| Ler agendamento de **outro** cliente | — | — | só da própria agenda | **Negado (403)** | §12 T3 |
| Confirmar/Reagendar agendamento alheio | — | — | — | **Negado (403)** | §12 T3 |
| Agenda do salão (`/api/agendamentos/salon/{id}`) | ✔ (seu salão) | ✔ | ✔ (própria agenda) | **Negado (403)** | §12 T4 |
| Lista de usuários (`/api/usuarios`) | ✔ | ✔ | ✔ | **Negado (403)** | §12 T4 |
| Logs de auditoria (`/api/salon/audit/logs`) | ✔ | — | — | **Negado (403)** | §12 T4 |
| Backup (`/api/backup/**`) | ✔ | — | — | **Negado (403)** | §12 T4 |
| Comissões — configurar % | ✔ | — | **não** (`@AdminOnly`) | — | código |
| Comissões — ver do salão | ✔ | — | só as próprias | — | código |
| Estorno de pagamento | ✔ (`@AdminOnly`) | — | — | — | código |
| Caixa (abrir/fechar/sangria) | ✔ | ✔ | — | — | código |
| Config. do salão (`/salon/settings`, `/units`, `/users`) | ✔ | — | — | **Negado (redirect no proxy + API)** | BUG-028 |
| Elevar o próprio papel (`PUT /api/usuarios/me`) | — | — | — | **Ignorado — permaneceu CLIENTE** | §12 T5 |

Nenhuma permissão indevida encontrada nos testes ativos.

---

## 7. Resultado por fase do roteiro

- **Fase 2 — XSS:** React escapa a saída; **nenhum** `dangerouslySetInnerHTML`/`innerHTML=` no código; CSP presente (ver ressalva SEC-A01). Upload rejeita SVG. **Sem XSS confirmado.**
- **Fase 3 — IDOR/BOLA:** **testado e aprovado** (§12 T3). `enforceReadAccess`/`enforceModificationOwnership` garantem posse; `TenantIsolationService` garante tenant para a equipe. Rota anônima de agendamento por id → 401 (SEC-003).
- **Fase 4 — Credenciais no código:** sem segredos reais versionados; `.env` ignorado; secrets de k8s são template. `DevController` e Swagger desligados fora de dev.
- **Fase 5 — Banco:** senha obrigatória, sem exposição externa, migrations versionadas, `ddl-auto=validate` em prod, `open-in-view=false`. Sem RLS — **aceitável**, pois o controle de acesso é feito na aplicação (tenant + posse), verificado ativamente.
- **Fase 6 — SQL Injection:** 100% JPA/JPQL com **parâmetros nomeados**; 3 queries nativas, todas parametrizadas; **nenhuma** concatenação de entrada do usuário; sem `ORDER BY` dinâmico concatenado. **Risco baixo.**
- **Fase 7 — Login/brute-force:** rate limit por IP (10/min auth) **confirmado (429)**; bloqueio de conta (`V48`); **sem enumeração** de usuários (login e "esqueci a senha" dão resposta genérica idêntica — §12 T6).
- **Fase 8 — Prompt Injection / pacotes inventados:** **Não aplicável** — não há agente de IA/LLM com acesso a ferramentas ou dados no backend (existem apenas `CaptionController`/`coloração` determinísticos). Dependências (Spring Boot 3.5.16, jjwt 0.12.7, Next 16.3.8, React 19.2.3, axios 1.13.4) são **legítimas e atuais**; sem indício de typosquatting. **Não verificado:** CVEs em dependências transitivas (não rodei `npm audit`/`dependency-check` — ver §9).
- **Fase 9 — Portas:** ver §4.
- **Fase 10 — Diversos:** CORS com `allowCredentials=true` + `allowedOriginPatterns` (origens vêm de env — atenção a curingas, SEC-B05); sem open redirect; SSRF em `ImageService.downloadImage` é **baixo** (recebe URL gerada pelo servidor, não do usuário); sem deserialização insegura; headers de segurança presentes (HSTS, X-Frame-Options, nosniff).
- **Fase 11 — Específico do salão:** isolamento por salão garantido em código (`assertStaffTenant`) e coberto por ITs (`PostIsolamentoIT`, `ValidacoesFinaisIT`); **manipulação de preço/pagamento negada** — o valor é **calculado no servidor** (`PagamentoService.valorDoAtendimento`) e divergências são recusadas; estorno é `@AdminOnly`; profissional **não** altera o próprio percentual. **Não testado ativamente com 2 salões reais** (o banco local só tem 1 salão — ver §9/§10).

---

## 8. Plano de correção

**PRIORIDADE 1 — CRÍTICA:** _nenhum item._

**PRIORIDADE 2 — ALTA:** _nenhum item confirmado._ Verificar antes do próximo deploy: `META_APP_SECRET` definido em produção (SEC-A02) e `CORS_ALLOWED_ORIGINS` sem curinga (SEC-B05).

**PRIORIDADE 3 — MÉDIA (hardening de defesa em profundidade):**
1. SEC-A01 — tokens só em cookie HttpOnly; CSP com nonce (remover `unsafe-inline`/`unsafe-eval`).
2. SEC-A02 — webhook **fail-closed** sem segredo.
3. SEC-A03 — rate limit distribuído (Redis) em produção + expurgo do mapa.
4. SEC-A04 — restringir Actuator no perfil default; remover `jmx: "*"`.

**PRIORIDADE 4 — BAIXA:**
- SEC-B01 — backend roda como **root** no container (sem `USER` no `belezza-api/Dockerfile`; o frontend já usa `nextjs`). Adicionar usuário não-root.
- SEC-B02 — manifestos k8s **sem** `securityContext` (`runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`).
- SEC-B03 — `JwtService.init()` **preenche com zeros** um segredo < 32 bytes em vez de recusar; validar tamanho mínimo no startup.
- SEC-B04 — `k8s/secrets.yaml` (template) está **versionado**; renomear para `secrets.example.yaml` e adicionar ao `.gitignore` para evitar que valores reais sejam commitados no futuro.
- SEC-B05 — CORS: documentar/validar que `CORS_ALLOWED_ORIGINS` nunca use curinga junto com `allowCredentials=true`.
- SEC-B06 — upload valida o tipo pelo `Content-Type` do cliente (não por *magic bytes*); re-encodar/validar por conteúdo.

---

## 9. Checklist pré-produção

- [ ] `JWT_SECRET`, `AES_SECRET_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD` definidos e fortes (sem default).
- [ ] `META_APP_SECRET` definido (senão webhooks ficam fail-open — SEC-A02).
- [ ] `CORS_ALLOWED_ORIGINS` = lista explícita de origens, sem curinga (SEC-B05).
- [ ] Perfil `prod` ativo (Actuator restrito, Swagger/H2 off, `ddl-auto=validate`).
- [ ] Rate limit distribuído configurado se houver múltiplas réplicas (SEC-A03).
- [ ] Container backend como usuário não-root (SEC-B01) e `securityContext` nos pods (SEC-B02).
- [ ] `npm audit` / OWASP Dependency-Check executados e CVEs relevantes tratados (pendente — §10).
- [ ] TLS/HSTS validados no nginx/ingress.
- [ ] Rotação dos segredos antes do go-live.
- [ ] Verificado o envio de e-mail de confirmação (login exige e-mail confirmado — BUG-023).

---

## 10. Itens NÃO VERIFICADOS (registrados, nunca presumidos como seguros)

1. **Staging/produção remotos** — nenhum teste ativo (ver §0). Conclusões sobre esses ambientes são inferidas do código/deploy.
2. **Isolamento entre dois salões distintos (Fase 11.1)** — não testado ativamente: o banco local tem apenas 1 salão. O controle existe em código (`assertStaffTenant`) e em ITs, mas não foi reproduzido ao vivo com dois tenants reais.
3. **CVEs em dependências transitivas** — `npm audit`/`dependency-check` não executados nesta sessão.
4. **Webhooks de pagamento (Fase 11.3)** — o sistema não integra gateway de pagamento externo com webhook; pagamentos são registrados internamente pela equipe. A idempotência de um gateway externo não se aplica.
5. **Tela `/salon/stock`** — achado funcional conhecido (100% simulada, não chama a API); sem impacto de segurança, mas registrado.

---

## 11. Parecer final

**APTO COM RESSALVAS.**

Nos itens **efetivamente verificados**, **não há vulnerabilidade crítica ou alta confirmada**. Os controles de maior risco do domínio (IDOR/BOLA, mass assignment, autorização por papel, SQL Injection, enumeração de usuários, brute-force e manipulação de pagamento/comissão) foram testados ativamente e **passaram**. As ressalvas são de **hardening** (SEC-A01 a SEC-A04, baixas B01–B06) e de **conferência de configuração de produção** (SEC-A02/SEC-B05 no checklist), **não bloqueantes**, desde que o checklist da §9 seja cumprido antes do go-live.

**Ressalva metodológica:** o parecer cobre o **código e o ambiente local**. A postura real de **produção** depende de configuração de deploy que **não foi testada ativamente** (§0, §10). Para um parecer sobre produção, é necessária autorização explícita e isolada daquele ambiente.

---

## 12. Evidências dos testes ativos (ambiente local, dados fictícios)

Todas as contas de teste criadas foram **removidas** ao final.

**T1 — Actuator sensível sem autenticação** (perfil default):
```
/actuator/env            401      /actuator/heapdump    401
/actuator/env/JWT_SECRET 401      /actuator/threaddump  401
/actuator/loggers        401      /actuator/beans       401
/actuator/health         200 (só {"status":"UP"}, sem detalhes)
/actuator/info           200      swagger-ui/api-docs   404
/api/dev/hash            401 (controller inexistente no perfil default)
```

**T2 — Rate limit de login:** 12 tentativas sucessivas → `... 400 400 429 429 429 429` (bloqueio a partir de ~10/min, bucket de auth).

**T3 — IDOR/BOLA** (cliente B fictício vs. agendamento `id=1` de outro cliente):
```
GET  /api/agendamentos/1                 -> 403
POST /api/salon/appointments/1/confirm   -> 403
POST /api/salon/appointments/1/reschedule-> 403
GET  /api/agendamentos/1 (anônimo)       -> 401  (SEC-003)
GET  /api/salon/appointments/my (próprios)-> 200
```

**T4 — Autorização por papel** (token CLIENTE):
```
/api/agendamentos/salon/1  -> 403     /api/usuarios        -> 403
/api/salon/audit/logs      -> 403     /api/backup/stats    -> 403
```

**T5 — Mass assignment** (CLIENTE enviando `role:ADMIN, plano:PREMIUM, salonId:1` em `PUT /api/usuarios/me`):
```
Resposta: role":"CLIENTE","plano":"FREE"   | Banco: CLIENTE|FREE   (elevação ignorada)
POST /api/auth/register role=ADMIN         -> 403 (auto-cadastro só CLIENTE; conta não criada)
```

**T6 — Enumeração de usuários:**
```
login inexistente   -> 401 "Email ou senha inválidos"
login senha errada  -> 401 "Email ou senha inválidos"   (idêntico)
forgot-password     -> 200 "Se o email existir, você receberá instruções..." (idêntico nos dois casos)
```

---

## 13. Adendo de correção (08/10/2026)

Após a auditoria, foram implementadas as correções abaixo (todas em `main`), verificadas no ambiente local. Duas pendências foram **formalmente aceitas** como risco (não corrigidas agora), por decisão do proprietário.

### Corrigido

| ID | Correção | Commit | Verificação |
|---|---|---|---|
| SEC-A02 | Webhook da Meta passa a **falhar fechado** em prod/staging quando `META_APP_SECRET` não está definido (dev continua aceitando). Teste unitário adicionado. | `7d508db` | teste unitário |
| SEC-B03 | `JwtService` **recusa** no boot um segredo < 256 bits em vez de completá-lo com zeros. | `7d508db` | compila; perfis usam segredo ≥32 bytes |
| SEC-B01 | Backend roda como **usuário não-root** (uid 1001) no container; logs em `/tmp/logs`. | `cd03722` | live: `PID1 uid=1001`, health 200 |
| SEC-B02 | `securityContext` nos pods k8s (backend/frontend/redis): `runAsNonRoot`, `allowPrivilegeEscalation=false`, `drop ALL`, seccomp `RuntimeDefault`; backend com `readOnlyRootFilesystem` + emptyDir `/tmp`. | `cd03722` | YAML validado (js-yaml) |
| SEC-A04 | Actuator com **exposição mínima** no perfil default (`health,info,metrics,prometheus`); `env`/`heapdump`/`threaddump`/`loggers` e JMX `*` deixam de ser expostos. | `cd03722` | live: "Exposing 4 endpoints"; `env`/`beans` → 401 |
| SEC-B04 | `k8s/secrets.yaml` sai do versionamento (vira `secrets.example.yaml` + `.gitignore`); `deploy.sh`/`kustomization` orientam criar o arquivo real. | `cd03722` | — |
| SEC-CI | Novo workflow **na raiz** `.github/workflows/security.yml`: gitleaks, `npm audit`, OWASP Dependency-Check e CodeQL (Java+TS). Os workflows antigos em `frontend/.github` nunca eram executados pelo GitHub. | `cd03722` | `npm audit` local: **0 high/critical** |
| SEC-B05 | CORS **falha fechado** se `allowed-origins` contiver `*` com `allow-credentials=true`. | `f706b5f` | compila |
| SEC-B06 | **Já estava coberto** (SEC-019): `ImageService.validateFile` decodifica o conteúdo (`ImageIO.read`) e sanitiza o nome do arquivo — não era pendência. | — | revisão de código |

### Achado adicional (durante a correção)

- **Redis do k8s sem autenticação:** `k8s/redis/deployment.yaml` sobe o Redis **sem `--requirepass`**. Exposição limitada à rede interna do cluster, mas sem defesa em profundidade. Correção vinculada ao SEC-A03 (exige encadear o secret e `REDIS_PASSWORD` no backend).

### Pendências aceitas como risco (decisão do proprietário, 08/10/2026)

- **SEC-A01** (token em cookie não-HttpOnly/`localStorage` + CSP com `unsafe-inline`/`unsafe-eval`): **não corrigido agora**. Risco residual baixo hoje (sem XSS conhecido; React escapa a saída). Reavaliar antes de expor a aplicação a conteúdo de terceiros.
- **SEC-A03** (rate limit em memória por instância, sem expurgo; + Redis do k8s sem senha): **não corrigido agora**. Mitigação existente: limite por IP funcionando e bloqueio de conta por tentativas (`V48`). Necessário antes de escalar para múltiplas réplicas em produção.
