# Relatório de correções — Belezza (sistemasalao)

**Período:** 22/09/2026 a 01/10/2026
**Branch:** `feat/notificacoes-clientes-usuarios` (também enviado ao `main`)
**Último commit coberto:** `977a661`

## Resumo

| Frente | Itens | Situação |
|---|---|---|
| Correções iniciais (dados reais, sessão, agenda, notificações) | 17 commits | Concluído |
| Auditoria de segurança (SEC) | SEC-001 a SEC-020 (sem SEC-007) | Concluído |
| Bugs do QA | BUG-001 a BUG-041 (41 bugs) | Concluído |
| Teste de ataques (8 tipos) e correções | 7 correções | Concluído |
| Atualização de dependências | Next.js, npm audit, Spring Boot | Concluído |

- **98 commits** no período (sem contar merges).
- **Testes do backend:** 349 passando, 0 falhas (eram 342 antes das últimas correções; 19 testes que dependem de Docker ficam pulados sem Docker).
- **Frontend:** nenhum erro de tipo novo; os testes novos passam.
- Antes de cada push, o hook `pre-push` procura senhas e chaves no que vai ser enviado.

---

## 1. Correções iniciais (22 e 23/09)

Telas que mostravam dados inventados e falhas de sessão e notificação.

| Commit | O que foi corrigido |
|---|---|
| `cd6d528` | Caixa: lista de transações passa a vir dos pagamentos reais (a tela ficava sempre vazia). |
| `a38a878` | Ambiente local: o banco H2 deixa de ser apagado a cada reinício do backend. |
| `698c7ec` | Total gasto, ticket médio e última visita do cliente passam a ser atualizados a cada pagamento. |
| `d5eb5d6` | Histórico real do cliente ("Ver Histórico" mostrava dados de exemplo) e recálculo das estatísticas. |
| `30ce676` | Dashboard: período "mensal" considerava só até hoje e deixava agendamentos do resto do mês de fora. |
| `ba1dcca` | Dashboard do admin: faturamento, ranking e serviços mais vendidos eram aleatórios; agora são reais. |
| `378ac9e` | Profissionais: faturamento do mês e avaliação reais (estavam sempre zerados). |
| `7b681e1` | "Registrar Pagamento" chamava um endpoint que não existia: o pagamento nunca era gravado. |
| `705f009` | Sessão: a renovação automática do token era agendada para ~250 h depois, e a sessão expirava sem aviso. |
| `f724962` | Agenda: fuso horário mostrava tudo ocupado no dia errado; cards presos em "hoje". |
| `5a423ca` | Notificações de confirmação, notas internas (nunca visíveis ao cliente) e caixa com dados reais. |
| `d5f1d0c` | **Segurança:** qualquer pessoa podia se cadastrar como ADMIN; listas de clientes, profissionais e financeiro estavam abertas sem login; cliente cancelava agendamento de outro cliente pelo ID. |
| `6b181f4` | Notificações em tempo real eram descartadas; acesso a comissões, avaliações e fidelidade de outros clientes/salões. |
| `e556df9` | A equipe passa a ser avisada em toda mudança de status do agendamento. |
| `996e496` | A sessão caía sozinha em qualquer falha de rede durante a renovação. |
| `45a6897`, `9664a83`, `3ab3392` | Redirecionamento da raiz para o login, teste de integração do fluxo agendamento + pagamento, limpeza do repositório. |

## 2. Auditoria de segurança (SEC)

| Item | Problema | Correção |
|---|---|---|
| SEC-001 | Qualquer usuário logado editava qualquer conta (inclusive a senha de um ADMIN) pelo ID. | Só o ADMIN edita terceiros, no próprio salão; cada um edita só a própria conta. |
| SEC-002 | Cliente podia mudar o próprio plano, papel ou verificação pelo formulário de perfil. | Endpoint próprio `PUT /api/usuarios/me` aceitando só nome, telefone, foto e senha. |
| SEC-003 | Qualquer pessoa, sem login, lia qualquer agendamento pelo ID. | Exige login; cliente vê só os seus, equipe só os do próprio salão. |
| SEC-004 | Admin de um salão listava agendamentos de clientes de outro salão. | Checagem de salão nas listagens por cliente, profissional e agenda do dia. |
| SEC-005/006 | Qualquer usuário logado via/criava chaves de API e via a equipe de qualquer salão. | Só o ADMIN dono do salão. |
| SEC-008 | Agendamento podia ser criado em nome de qualquer cliente. | Cliente agenda sempre para si; equipe só para clientes do próprio salão. |
| SEC-009 | Sem Redis, o logout não invalidava o token. | Lista de tokens revogados em memória. |
| SEC-010 | Console do banco H2 ligado também em produção. | Desligado por padrão; só local e só pelo próprio computador. |
| SEC-011 | Pagamentos e mensagens de WhatsApp de outros salões acessíveis. | Isolamento por salão. |
| SEC-012 | Chaves JWT e AES com valor padrão público. | Produção não sobe com chave fraca ou padrão. |
| SEC-013 | Sem cabeçalhos de segurança; cookies frágeis. | CSP, X-Frame-Options, HSTS etc.; cookies `SameSite=Strict` e `Secure`. |
| SEC-014 | Senhas e tokens apareciam nos logs do proxy. | Logs sem corpo de requisição/resposta e sem token. |
| SEC-015 | Limite de requisições burlável trocando o cabeçalho `X-Forwarded-For`. | IP real do socket; limite próprio (10/min) para login e cadastro. |
| SEC-016 | O cadastro revelava se um e-mail já tinha conta. | Resposta sempre igual. |
| SEC-017 | Webhooks do WhatsApp/Meta aceitavam mensagens forjadas. | Assinatura HMAC verificada. |
| SEC-018 | Perfil do negócio com dados falsos e visível a qualquer usuário. | Dados reais, só para o ADMIN do salão. |
| SEC-019 | Upload aceitava qualquer arquivo dizendo ser imagem; nomes com `../`. | Conteúdo verificado e nome do arquivo saneado. |
| SEC-020 | Senha e tokens podiam sair ao serializar o usuário. | Campos sensíveis nunca são serializados. |

Também: hook `pre-push` de varredura de segredos (`7c9cc5c`), correção dos testes quebrados pelas mudanças (`957cf46`) e backup do banco restrito aos operadores da plataforma, sem path traversal (`f8da6de`).

## 3. Bugs do QA (BUG-001 a BUG-041)

### Isolamento entre salões e permissões

| Bug | Correção |
|---|---|
| BUG-001 | Registro e estorno de pagamentos só no próprio salão. |
| BUG-002 | Horários e bloqueios: só o próprio profissional ou o admin do salão alteram. |
| BUG-003 | Usuários isolados por salão; fim da "sincronização" que puxava clientes de todos os salões. |
| BUG-004 | Comissões e repasses isolados por salão. |
| BUG-005 | Clientes e criação de agendamentos isolados por salão. |
| BUG-012 | Profissional acessa só a própria agenda e os próprios pagamentos. |
| BUG-013 | Só o ADMIN estorna pagamentos (antes o profissional também podia). |
| BUG-027 | Excluir definitivamente é recusado para quem tem movimentação financeira. |
| BUG-028 | Troca de papel (profissional ↔ recepcionista) mantém os cadastros coerentes. |
| BUG-037 | Funcionário tem "Meu Perfil" próprio, em vez de abrir o perfil do negócio. |
| BUG-041 | Recepcionista vê só o financeiro do dia; profissional edita a própria especialidade e bio; expediente só o admin altera. |

### Agendamento

| Bug | Correção |
|---|---|
| BUG-007 | Agendamentos duplicados em cliques/requisições simultâneas. |
| BUG-009 | Agendamento em folga do profissional ou com o salão fechado era aceito. |
| BUG-010 | Vários serviços validados pela duração total. |
| BUG-017 | Regras de antecedência do salão aplicadas na criação e no cancelamento. |
| BUG-018 | Falta (no-show) só depois do horário e pode ser desfeita; falta automática 30 min após o horário, com aviso à equipe. |
| BUG-021 | Reagendar para um horário que cruza o antigo não conflita mais consigo mesmo. |
| BUG-022 | Profissional só é agendado para serviços que realiza. |
| BUG-023 | Atendimento em andamento não é cancelado nem reagendado; início só perto do horário. |
| BUG-024 | Duplo clique não processa a ação duas vezes; finalizar não responde mais erro 500. |
| BUG-033 | Ausência e desativação de profissional/serviço avisam sobre agendamentos marcados e deixam escolher cancelar ou manter. |
| BUG-036 | Telas pedem o período ao backend, em vez dos N primeiros agendamentos. |
| BUG-038 | Agendamento do cliente: um cabeçalho só e preços em R$ no formato brasileiro. |
| BUG-041 | Cliente agenda só nos horários da grade; cliente edita a própria avaliação por até 7 dias. |

### Financeiro, caixa e pagamentos

| Bug | Correção |
|---|---|
| BUG-006 | Caixa real: abertura, movimentações (sangria, suprimento, despesa) e fechamento (antes era simulado). |
| BUG-008 | Valor do pagamento conferido; troco calculado; pagamento dividido (ex.: PIX + dinheiro). |
| BUG-014 | Estorno cancela a comissão e desfaz as estatísticas do cliente. |
| BUG-020 | Relatórios, painel e comissões com dados reais (antes valores fixos). |
| BUG-025 | "Minha Agenda" do cliente mostra atendimento pago como pago. |
| BUG-034 | Mesma receita na agenda e no caixa; transferência separada do débito. |
| Extras | Repasse cancelado não bloqueia novo repasse (`76d0510`); valor recebido do dia segue a regra do caixa e a data local (`0ba9723`). |

### Cadastros, clientes e configurações

| Bug | Correção |
|---|---|
| BUG-011 | Salvar o horário do salão não sobrescreve o expediente dos profissionais. |
| BUG-019 | Recepcionista edita cliente; busca por telefone compara só os dígitos. |
| BUG-026 | Cliente excluído não entra nem agenda; filtro "Inativos" e ação "Reativar". |
| BUG-031 | Telefone e data de nascimento validados; telefone duplicado detectado em qualquer formato. |
| BUG-032 | Horário invertido, duração e comissão impossíveis são recusados. |
| BUG-040 | Busca de clientes ignora acentos, maiúsculas e espaços repetidos. |
| BUG-041 | E-mail com espaços nas pontas é aceito. |
| Extras | Lista de espera sem o cliente de exemplo "João Silva" (`052bfe5`); editar em Usuários não apaga mais especialidade e bio do profissional (`578e2e3`). |

### Sessão, login e API

| Bug | Correção |
|---|---|
| BUG-015 | Sessão expirada responde 401 e o frontend renova o token. |
| BUG-016 | Prefixo `/api` duplicado nas chamadas (erros 500 em várias telas). |
| BUG-029 | Bloqueio por conta contra força bruta no login. |
| BUG-030 | Trocar a própria senha exige a senha atual; política de senha única (8+ caracteres, maiúscula, minúscula, número). |
| BUG-035 | Telas da recepção usam o login do salão e o salão do usuário. |
| BUG-039 | Códigos HTTP e mensagens consistentes (rota inexistente 404, formato errado 400, mensagens em português). |

## 4. Teste de ataques (30/09 e 01/10)

Testamos 8 tipos de ataque. Resultado e o que foi feito:

| Ataque | Situação encontrada | Ação |
|---|---|---|
| 1. XSS | O PDF de comissões e os e-mails montavam HTML com dados do cadastro sem escapar. | **Corrigido** (`054be03`): todo valor escapado; o PDF ganhou uma CSP. |
| 2. Rotas de API expostas | Rotas sensíveis já exigiam login e papel. A IA e as imagens estavam liberadas para clientes. | **Corrigido** (`9753121`): IA e imagens só para a equipe, com limite de tamanho. |
| 3. Chave de API exposta | Nenhuma chave real no código; o hook `pre-push` barra novas. | Sem correção necessária. |
| 4. Banco de dados aberto | Docker publicava banco, Redis e API para a rede, com senhas padrão. | **Corrigido** (`828af26`): portas só em `127.0.0.1`, senhas obrigatórias, Redis com senha. |
| 5. SQL Injection | Consultas parametrizadas; os payloads testados não vazaram nada. | Sem correção necessária. |
| 6. Tentativas de senha ilimitadas | Havia limite por IP e um bloqueio temporário em memória (BUG-029), que passava sozinho e não valia entre instâncias. | **Corrigido** (`f2c4f5a`): conta bloqueada após 6 senhas erradas (admin desbloqueia ou redefinição de senha); IP bloqueado por 30 min após 20 erros em 15 min. |
| 7. Prompt injection | Risco limitado à IA de legendas. | **Mitigado** (`9753121`): IA só para a equipe, textos com limite de tamanho. |
| 8. Pacotes injetados / vulneráveis | 29 alertas no `npm audit`; Spring Boot desatualizado. | **Corrigido** (`bed32d8`, `70c1e33`), ver seção 5. |

Correções adicionais da mesma lista:

- **Dados pessoais:** e-mail e telefone dos profissionais deixaram de ser enviados aos clientes (`9753121`).
- **Recuperação de senha** (`d859472`): no máximo 3 e-mails por hora para o mesmo endereço, com 2 minutos entre eles. A resposta não muda, para não revelar quais e-mails têm conta.
- **CSV/Excel** (`977a661`): proteção contra injeção de fórmula (ex.: um nome `=HYPERLINK(...)` virava link na planilha). Vale nas exportações de comissões, relatório financeiro, caixa e extrato.

## 5. Dependências

| Pacote | Antes | Depois |
|---|---|---|
| Next.js / eslint-config-next | 16.1.6 | 16.3.8 |
| sharp | 0.34.5 | 0.35.5 |
| Alertas do `npm audit` | 29 | 6 altos, 0 críticos |
| Spring Boot | 3.2.2 | 3.5.16 |
| springdoc | 2.3.0 | 2.8.17 |
| jjwt | 0.12.3 | 0.12.7 |
| Testcontainers | 1.19.3 | 1.21.4 |
| Flyway | 10.7.1 fixo | versão do Spring Boot |

Os 6 alertas restantes vêm do `next-pwa`, que está abandonado; a "correção" sugerida pelo npm seria voltar para uma versão mais antiga.

## 6. Como foi validado

- **Testes automatizados do backend:** 349 passando, 0 falhas (19 dependem de Docker e são pulados sem ele).
- **Testes do frontend:** verificação de tipos sem erros novos; testes novos (ex.: CSV) passando.
- **Testes na API em execução:** cada correção reproduzida antes e conferida depois, com scripts por perfil (admin, recepcionista, profissional e cliente).
- **Testes no navegador:** telas principais de cada perfil abertas e conferidas sem erros após as atualizações.

## 7. Pendências e próximos passos

| Item | Observação |
|---|---|
| 22 erros de tipo no frontend | Já existiam e impedem o `next build` de produção. Prioridade alta antes de publicar. |
| Trocar o `next-pwa` | Abandonado; responde pelos 6 alertas restantes do `npm audit`. |
| Spring Boot 4.x | Combinado para depois da 3.5. |
| Link de redefinição no log | Com o envio de e-mail desligado, o link completo vai para o log. Mascarar. |
| Lista de comissões do profissional | Mostra no máximo 100 registros (os mais antigos primeiro). |
| Lista de espera | Ainda não tem backend real; a aba avisa que o recurso não está disponível. |
| Exportação de logs de auditoria | O backend devolve um arquivo de exemplo fixo. |
| Token da sessão no navegador | Continua acessível a JavaScript por exigência do WebSocket; evoluir a CSP para nonce. |
