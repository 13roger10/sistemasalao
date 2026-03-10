# REPOSITORIO E GITFLOW
## Belezza.ai - Padrao de Versionamento

---

## 1. ESTRUTURA DE REPOSITORIOS

### 1.1 Repositorios do Projeto

| Repositorio | Descricao | Tecnologia |
|-------------|-----------|------------|
| `belezza-api` | Backend API | Java + Spring Boot |
| `belezza-web` | Frontend Web | Next.js (existente) |
| `belezza-docs` | Documentacao | Markdown |
| `belezza-infra` | IaC (Terraform) | HCL |

### 1.2 Estrutura do Repositorio Backend

```
belezza-api/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   └── cd-production.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── task.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── src/
│   ├── main/
│   │   ├── java/com/belezza/api/
│   │   └── resources/
│   └── test/
│       └── java/com/belezza/api/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   └── api/
├── .gitignore
├── .editorconfig
├── pom.xml
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── CHANGELOG.md
```

---

## 2. GITFLOW - FLUXO DE BRANCHES

### 2.1 Branches Principais

| Branch | Proposito | Protecao |
|--------|-----------|----------|
| `main` | Producao | Protegida, requer PR |
| `develop` | Desenvolvimento | Protegida, requer PR |

### 2.2 Branches de Suporte

| Prefixo | Origem | Destino | Exemplo |
|---------|--------|---------|---------|
| `feature/` | develop | develop | feature/BELL-123-agendamento |
| `bugfix/` | develop | develop | bugfix/BELL-456-fix-login |
| `hotfix/` | main | main + develop | hotfix/BELL-789-security-fix |
| `release/` | develop | main + develop | release/1.0.0 |

### 2.3 Fluxo Visual

```
main ─────●─────────────────────●─────────────────●───────
          │                     ↑                 ↑
          │                     │                 │
          │              release/1.0.0    hotfix/1.0.1
          │                     ↑                 │
          │                     │                 │
develop ──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●────
             │     ↑  │     ↑
             │     │  │     │
          feature/A  feature/B
```

---

## 3. CONVENCOES DE NOMENCLATURA

### 3.1 Branches

```
<tipo>/<ticket>-<descricao-curta>
```

**Exemplos:**
- `feature/BELL-001-auth-jwt`
- `feature/BELL-015-agendamento-crud`
- `bugfix/BELL-042-fix-token-refresh`
- `hotfix/BELL-100-sql-injection-fix`
- `release/1.2.0`

### 3.2 Commits (Conventional Commits)

```
<tipo>(<escopo>): <descricao>

[corpo opcional]

[rodape opcional]
```

**Tipos:**
| Tipo | Descricao |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correcao de bug |
| `docs` | Documentacao |
| `style` | Formatacao (sem mudanca de codigo) |
| `refactor` | Refatoracao |
| `perf` | Melhoria de performance |
| `test` | Adicao/correcao de testes |
| `build` | Build system ou dependencias |
| `ci` | CI/CD |
| `chore` | Outras mudancas |

**Exemplos:**
```
feat(auth): implement JWT authentication

- Add JwtService for token generation
- Add JwtAuthenticationFilter
- Configure Spring Security

Closes BELL-001
```

```
fix(agendamento): prevent double booking

Check for conflicting appointments before creating new one.

Fixes BELL-042
```

### 3.3 Tags de Versao

```
v<major>.<minor>.<patch>
```

**Exemplos:**
- `v1.0.0` - Lancamento inicial
- `v1.1.0` - Nova feature
- `v1.1.1` - Bug fix

---

## 4. REGRAS DE BRANCH PROTECTION

### 4.1 Branch `main`

```yaml
protection_rules:
  require_pull_request:
    required_approving_review_count: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  require_status_checks:
    strict: true
    contexts:
      - "build"
      - "test"
      - "security-scan"
  require_conversation_resolution: true
  require_signed_commits: false
  allow_force_pushes: false
  allow_deletions: false
```

### 4.2 Branch `develop`

```yaml
protection_rules:
  require_pull_request:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
  require_status_checks:
    strict: true
    contexts:
      - "build"
      - "test"
  require_conversation_resolution: true
  allow_force_pushes: false
  allow_deletions: false
```

---

## 5. TEMPLATES

### 5.1 Pull Request Template

```markdown
## Descricao
<!-- Descreva as mudancas realizadas -->

## Tipo de Mudanca
- [ ] Nova feature
- [ ] Bug fix
- [ ] Refatoracao
- [ ] Documentacao
- [ ] CI/CD

## Ticket
<!-- Link para o ticket (JIRA/Linear) -->
Closes #

## Checklist
- [ ] Codigo segue os padroes do projeto
- [ ] Self-review realizado
- [ ] Testes adicionados/atualizados
- [ ] Documentacao atualizada (se necessario)
- [ ] Sem warnings de compilacao
- [ ] Cobertura de testes >= 80%

## Screenshots (se aplicavel)
<!-- Adicione screenshots se houver mudancas visuais -->

## Como Testar
<!-- Instrucoes para testar as mudancas -->
1.
2.
3.
```

### 5.2 Bug Report Template

```markdown
---
name: Bug Report
about: Reporte um bug encontrado
title: '[BUG] '
labels: bug
assignees: ''
---

## Descricao do Bug
<!-- Descricao clara e concisa do bug -->

## Passos para Reproduzir
1. Va para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado
<!-- O que deveria acontecer -->

## Comportamento Atual
<!-- O que esta acontecendo -->

## Screenshots
<!-- Se aplicavel, adicione screenshots -->

## Ambiente
- OS: [ex: Windows 11]
- Browser: [ex: Chrome 120]
- Versao da API: [ex: 1.2.0]

## Logs
<!-- Cole logs relevantes aqui -->
```

### 5.3 Feature Request Template

```markdown
---
name: Feature Request
about: Sugira uma nova funcionalidade
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Problema
<!-- Descreva o problema que esta feature resolve -->

## Solucao Proposta
<!-- Descreva a solucao que voce gostaria -->

## Alternativas Consideradas
<!-- Outras solucoes que voce considerou -->

## Contexto Adicional
<!-- Qualquer outro contexto sobre a feature -->

## Mockups/Wireframes
<!-- Se aplicavel, adicione mockups -->
```

### 5.4 Task Template

```markdown
---
name: Task
about: Tarefa tecnica ou de desenvolvimento
title: '[TASK] '
labels: task
assignees: ''
---

## Descricao
<!-- Descreva a tarefa -->

## Criterios de Aceite
- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

## Notas Tecnicas
<!-- Detalhes tecnicos relevantes -->

## Dependencias
<!-- Outras tarefas que esta depende -->

## Estimativa
<!-- Story points ou horas -->
```

---

## 6. CODEOWNERS

```
# Backend API
/src/main/java/com/belezza/api/security/  @security-team
/src/main/java/com/belezza/api/integration/ @integration-team

# Config
/src/main/resources/  @devops-team
/.github/workflows/   @devops-team

# Docs
/docs/  @docs-team
*.md    @docs-team
```

---

## 7. WORKFLOW DE DESENVOLVIMENTO

### 7.1 Iniciando uma Feature

```bash
# 1. Atualize develop
git checkout develop
git pull origin develop

# 2. Crie branch da feature
git checkout -b feature/BELL-001-auth-jwt

# 3. Desenvolva e commit
git add .
git commit -m "feat(auth): implement JWT service"

# 4. Push
git push -u origin feature/BELL-001-auth-jwt

# 5. Abra PR para develop
```

### 7.2 Release

```bash
# 1. Crie branch de release
git checkout develop
git checkout -b release/1.0.0

# 2. Atualize versao
# - pom.xml
# - CHANGELOG.md

# 3. Commit e push
git commit -m "chore: prepare release 1.0.0"
git push -u origin release/1.0.0

# 4. PR para main (requer 2 approvals)
# 5. Apos merge, tag
git checkout main
git pull
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# 6. Merge back para develop
git checkout develop
git merge main
git push
```

### 7.3 Hotfix

```bash
# 1. Crie branch de hotfix a partir de main
git checkout main
git checkout -b hotfix/BELL-100-security-fix

# 2. Corrija o bug
git commit -m "fix(security): patch SQL injection vulnerability"

# 3. PR para main (urgente, 1 approval)
# 4. Apos merge, tag
git tag -a v1.0.1 -m "Hotfix 1.0.1"

# 5. Merge para develop
git checkout develop
git merge main
```

---

## 8. CHANGELOG

### 8.1 Formato (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Nova feature X

### Changed
- Mudanca em Y

### Fixed
- Bug Z corrigido

## [1.0.0] - 2026-02-05

### Added
- Sistema de autenticacao JWT
- CRUD de agendamentos
- Integracao WhatsApp
- Social Studio IA

### Security
- Implementado rate limiting
- Validacao de inputs
```

---

## 9. CHECKLIST DE CONFIGURACAO

### 9.1 Criar Repositorio
- [ ] Criar repo `belezza-api` no GitHub
- [ ] Configurar branch `main` como default
- [ ] Criar branch `develop`
- [ ] Adicionar .gitignore (Java/Maven)
- [ ] Adicionar LICENSE (MIT ou proprietaria)
- [ ] Adicionar README.md inicial

### 9.2 Configurar Protecoes
- [ ] Proteger branch `main`
- [ ] Proteger branch `develop`
- [ ] Configurar CODEOWNERS
- [ ] Configurar required status checks

### 9.3 Templates
- [ ] Adicionar PR template
- [ ] Adicionar Bug Report template
- [ ] Adicionar Feature Request template
- [ ] Adicionar Task template

### 9.4 CI/CD
- [ ] Configurar GitHub Actions CI
- [ ] Configurar deploy para staging
- [ ] Configurar deploy para production
- [ ] Configurar secrets (tokens, credenciais)

---

*Documento: T0.4.1 a T0.4.4 - Repositorio e GitFlow*
*Versao: 1.0*
*Data: 05/02/2026*
