# MATRIZ DE PRIORIZACAO MoSCoW
## Belezza.ai - Backend Java + Spring Boot

---

## LEGENDA

| Categoria | Descricao |
|-----------|-----------|
| **MUST** | Obrigatorio - MVP nao funciona sem isso |
| **SHOULD** | Importante - Agrega muito valor, fazer se possivel |
| **COULD** | Desejavel - Bom ter, mas pode esperar |
| **WON'T** | Nao fazer agora - Fora do escopo MVP |

---

## MUST HAVE (Obrigatorio)

### Autenticacao
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| AUTH-01 | Registro de usuario | Base do sistema |
| AUTH-02 | Login com JWT | Seguranca obrigatoria |
| AUTH-03 | Refresh token | UX de sessao |
| AUTH-05 | Perfil do usuario | Gestao de conta |
| AUTH-06 | Roles | Controle de acesso |

### Gestao do Salao
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| SALON-01 | Cadastro do salao | Core do negocio |
| SALON-02 | Configuracoes | Personalizacao |
| SALON-03 | Cadastro profissionais | Equipe do salao |
| SALON-05 | Horarios de trabalho | Disponibilidade |

### Servicos
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| SERV-01 | Cadastro de servicos | O que o salao oferece |
| SERV-03 | Ativar/Desativar | Controle de catalogo |

### Agendamento
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| AGEND-01 | Criar agendamento | Core do produto |
| AGEND-02 | Validacao conflitos | Evitar overbooking |
| AGEND-03 | Listar agendamentos | Gestao da agenda |
| AGEND-04 | Cancelar | Flexibilidade |
| AGEND-05 | Reagendar | Flexibilidade |
| AGEND-06 | Bloqueio horarios | Controle da agenda |
| AGEND-09 | Calculo duracao | Automacao |

### Clientes
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CLIENT-01 | Cadastro clientes | Quem agenda |
| CLIENT-02 | Historico | Relacionamento |

### WhatsApp
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| WPP-01 | Confirmacao agendamento | Comunicacao essencial |
| WPP-02 | Lembrete 24h | Reduzir no-show |
| WPP-05 | Link cancelar/reagendar | Self-service |

### Social Studio - Imagens
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| IMG-01 | Upload de imagem | Base do Social Studio |
| IMG-02 | Armazenamento S3 | Persistencia |
| IMG-03 | Melhoria com IA | Diferencial do produto |
| IMG-04 | Remocao de fundo | Feature mais pedida |
| IMG-07 | Crops redes sociais | Otimizacao |

### Social Studio - Legendas
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CAPT-01 | Geracao legenda IA | Diferencial do produto |
| CAPT-02 | Sugestao hashtags | Alcance organico |
| CAPT-04 | Tons de voz | Personalizacao |

### Publicacao Social
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| PUB-01 | Conectar Instagram | Principal rede do nicho |
| PUB-02 | Conectar Facebook | Segunda rede |
| PUB-03 | Publicar post | Objetivo final |
| PUB-04 | Agendar publicacao | Planejamento |
| PUB-05 | Preview do post | UX essencial |

### Relatorios
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| REL-01 | Agendamentos periodo | Visao do negocio |

---

## SHOULD HAVE (Importante)

### Autenticacao
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| AUTH-04 | Recuperacao senha | Comum usuarios esquecerem |

### Gestao do Salao
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| SALON-04 | Especialidades profissional | Organiza servicos |

### Servicos
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| SERV-02 | Categorias servico | Organizacao |

### Agendamento
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| AGEND-07 | Confirmacao cliente | Reduz no-show |
| AGEND-08 | Regra no-show | Protege o salao |

### Clientes
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CLIENT-03 | Contador no-shows | Controle |

### WhatsApp
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| WPP-03 | Lembrete 2h | Reduz ainda mais no-show |
| WPP-04 | Pos-atendimento | Feedback e fidelizacao |
| WPP-06 | Status entrega | Confiabilidade |

### Social Studio - Imagens
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| IMG-05 | Desfoque fundo | Efeito profissional |
| IMG-06 | Upscale | Qualidade |
| IMG-08 | Historico edicoes | Versionamento |

### Social Studio - Legendas
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CAPT-03 | Call-to-action | Conversao |
| CAPT-06 | Otimizacao plataforma | Melhor resultado |

### Publicacao Social
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| PUB-06 | Status publicacao | Acompanhamento |

### Relatorios
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| REL-02 | Faturamento | Gestao financeira |
| REL-03 | Taxa no-show | KPI importante |

---

## COULD HAVE (Desejavel)

### Servicos
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| SERV-04 | Preco por profissional | Flexibilidade avancada |

### Agendamento
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| AGEND-10 | Multiplos servicos | Conveniencia |

### Clientes
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CLIENT-04 | Observacoes | Personalizacao |
| CLIENT-05 | Bloqueio cliente | Protecao |

### Social Studio - Legendas
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| CAPT-05 | Multi-idioma | Expansao futura |

### Publicacao Social
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| PUB-07 | Metricas basicas | Analytics |

### Relatorios
| ID | Funcionalidade | Justificativa |
|----|----------------|---------------|
| REL-04 | Engajamento social | Metricas avancadas |
| REL-05 | Ranking profissionais | Gestao equipe |

---

## WON'T HAVE (Fora do MVP)

| Funcionalidade | Motivo |
|----------------|--------|
| Pagamento online | Complexidade integracao |
| App mobile nativo | Custo de desenvolvimento |
| Chatbot WhatsApp | Escopo muito amplo |
| Marketplace | Modelo de negocio diferente |
| Programa fidelidade | Feature secundaria |
| Integracao caixa | Nao e core |
| White-label | Complexidade tecnica |
| Video editing | Escopo diferente |
| Analytics avancado | Pode usar ferramentas externas |
| Google Calendar sync | Integracao extra |
| TikTok integration | Rede secundaria |
| Pinterest integration | Rede secundaria |
| Email marketing | Usar ferramenta externa |
| SMS notifications | WhatsApp e suficiente |
| Multi-idioma UI | Foco Brasil primeiro |

---

## RESUMO POR CATEGORIA

| Categoria | Quantidade | % do Total |
|-----------|------------|------------|
| MUST | 42 | 58% |
| SHOULD | 18 | 25% |
| COULD | 10 | 14% |
| WON'T | 15 | - |

---

## ORDEM DE IMPLEMENTACAO SUGERIDA

### Sprint 1-2: Foundation
1. AUTH (MUST)
2. SALON (MUST)
3. SERV (MUST)

### Sprint 3-4: Core Business
4. AGEND (MUST)
5. CLIENT (MUST)

### Sprint 5-6: Communication
6. WPP (MUST + SHOULD)

### Sprint 7-8: Social Studio
7. IMG (MUST + SHOULD)
8. CAPT (MUST + SHOULD)

### Sprint 9-10: Publishing
9. PUB (MUST + SHOULD)

### Sprint 11-12: Analytics & Polish
10. REL (MUST + SHOULD)
11. Features COULD restantes

---

*Documento: T0.1.3 - Matriz MoSCoW*
*Versao: 1.0*
*Data: 05/02/2026*
