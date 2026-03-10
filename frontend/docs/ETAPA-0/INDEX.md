# ETAPA 0 - PLANEJAMENTO TECNICO
## Belezza.ai - Documentacao Completa

---

## STATUS: CONCLUIDA

| Tarefa | Documento | Status |
|--------|-----------|--------|
| T0.1.1 | [01-MVP-ESCOPO.md](./01-MVP-ESCOPO.md) | Concluido |
| T0.1.2 | [02-CRITERIOS-ACEITE.md](./02-CRITERIOS-ACEITE.md) | Concluido |
| T0.1.3 | [03-MATRIZ-MOSCOW.md](./03-MATRIZ-MOSCOW.md) | Concluido |
| T0.2.1-3 | [04-PLANOS-MONETIZACAO.md](./04-PLANOS-MONETIZACAO.md) | Concluido |
| T0.3.1-6 | [05-PROVEDORES-CUSTOS.md](./05-PROVEDORES-CUSTOS.md) | Concluido |
| T0.4.1-4 | [06-REPOSITORIO-GITFLOW.md](./06-REPOSITORIO-GITFLOW.md) | Concluido |

---

## RESUMO EXECUTIVO

### Escopo do MVP
- **70 funcionalidades** mapeadas
- **42 MUST HAVE** (obrigatorias)
- **9 modulos** principais

### Planos Definidos
| Plano | Preco | Target |
|-------|-------|--------|
| FREE | R$ 0 | Autonomos |
| PRO | R$ 49,90/mes | Saloes pequenos |
| PREMIUM | R$ 99,90/mes | Saloes medios |

### Provedores Selecionados
| Servico | Provedor |
|---------|----------|
| WhatsApp | Meta Cloud API |
| Redes Sociais | Meta Graph API |
| IA Imagem | Replicate |
| IA Texto | OpenAI GPT-4o-mini |
| Storage | AWS S3 |
| Database | PostgreSQL (Railway/AWS) |

### Custos Estimados
| Cenario | Custo Mensal |
|---------|--------------|
| MVP | R$ 170 |
| 100 saloes | R$ 1.215 |
| 500 saloes | R$ 5.250 |

### GitFlow
- Branches: `main`, `develop`, `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`
- Conventional Commits
- PR com code review obrigatorio

---

## PROXIMOS PASSOS

1. **ETAPA 1** - Setup do Projeto Spring Boot
   - Criar repositorio `belezza-api`
   - Configurar Maven e dependencias
   - Criar estrutura de pacotes
   - Configurar Docker

2. **Criar contas nos provedores:**
   - [ ] Meta Business Account
   - [ ] AWS Account
   - [ ] Replicate Account
   - [ ] OpenAI Account

---

*Data de conclusao: 05/02/2026*
