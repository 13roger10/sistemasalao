# Sistema de Gestão de Profissionais - Belezza

## 1. VISÃO GERAL

---

### 1.1 Objetivo do Sistema

O **Sistema de Gestão de Profissionais** do Belezza tem como objetivo principal:

- **Centralizar** o cadastro e gerenciamento de todos os profissionais do salão
- **Organizar** a agenda de trabalho de cada profissional
- **Vincular** serviços específicos a cada profissional conforme sua especialidade
- **Controlar** comissões e pagamentos de forma automatizada
- **Otimizar** o agendamento online permitindo que clientes escolham profissionais disponíveis
- **Aumentar** a produtividade e organização do salão

---

### 1.2 Escopo Completo

#### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Cadastro de Profissionais | ✅ Implementado | CRUD completo via API e Frontend |
| Vinculação com Usuário | ✅ Implementado | Cada profissional é vinculado a um usuário do sistema |
| Especialidades | ✅ Implementado | Campo para definir especialidade do profissional |
| Biografia/Perfil | ✅ Implementado | Campo bio para descrição do profissional |
| Foto de Perfil | ✅ Implementado | Upload e exibição de avatar |
| Vinculação de Serviços | ✅ Implementado | Relacionamento M:N com serviços |
| Horários de Trabalho | ✅ Implementado | Configuração por dia da semana com intervalos |
| Bloqueios de Horário | ✅ Implementado | Férias, folgas e indisponibilidades |
| Sistema de Comissões | ✅ Implementado | Porcentagem ou valor fixo por profissional |
| Agendamento Online | ✅ Implementado | Flag para aceitar/rejeitar agendamentos online |
| Soft Delete | ✅ Implementado | Desativação sem perda de histórico |
| Reativação | ✅ Implementado | Possibilidade de reativar profissionais |

#### Estrutura de Dados

```
PROFISSIONAL
├── id (Long) - Identificador único
├── usuario (Usuario) - Usuário vinculado (1:1)
├── salon (Salon) - Salão onde trabalha (N:1)
├── especialidade (String) - Ex: "Colorista", "Cabeleireiro"
├── bio (String) - Descrição/biografia
├── fotoUrl (String) - URL da foto de perfil
├── aceitaAgendamentoOnline (boolean) - Disponível para agendamento online
├── ativo (boolean) - Status ativo/inativo
├── tipoComissao (Enum) - PORCENTAGEM | FIXO
├── valorComissao (BigDecimal) - Valor da comissão
├── servicos (List<Servico>) - Serviços oferecidos (M:N)
├── horarios (List<HorarioTrabalho>) - Horários de trabalho (1:N)
├── criadoEm (LocalDateTime) - Data de criação
└── atualizadoEm (LocalDateTime) - Última atualização
```

#### APIs Disponíveis

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/api/profissionais` | Criar profissional | ADMIN |
| GET | `/api/profissionais/{id}` | Buscar por ID | Público |
| GET | `/api/profissionais/salon/{salonId}` | Listar por salão | Público |
| GET | `/api/profissionais/servico/{servicoId}` | Listar por serviço | Público |
| GET | `/api/profissionais/salon/{salonId}/disponiveis` | Disponíveis online | Público |
| PUT | `/api/profissionais/{id}` | Atualizar | ADMIN |
| DELETE | `/api/profissionais/{id}` | Desativar | ADMIN |
| PUT | `/api/profissionais/{id}/reativar` | Reativar | ADMIN |

---

### 1.3 Validação da Necessidade

#### Por que o sistema de gestão de profissionais é essencial?

1. **Organização Operacional**
   - Centraliza informações de toda a equipe em um único lugar
   - Facilita a consulta de disponibilidade e especialidades
   - Reduz conflitos de agendamento

2. **Experiência do Cliente**
   - Permite que clientes escolham o profissional de preferência
   - Mostra especialidades e avaliações de cada profissional
   - Oferece agendamento online inteligente

3. **Controle Financeiro**
   - Automatiza o cálculo de comissões
   - Gera relatórios de produtividade por profissional
   - Permite análise de performance da equipe

4. **Escalabilidade**
   - Suporta múltiplos profissionais por salão
   - Permite diferentes tipos de profissionais (categorias)
   - Flexível para diferentes modelos de comissão

---

### 1.4 Stakeholders

#### Proprietário / Gestor (Role: ADMIN)

| Aspecto | Descrição |
|---------|-----------|
| **Perfil** | Dono ou gerente do salão de beleza |
| **Acesso** | Total - todas as funcionalidades do sistema |
| **Responsabilidades** | Cadastrar profissionais, definir comissões, gerenciar equipe |
| **Permissões** | Criar, editar, desativar e reativar profissionais |

**Funcionalidades Disponíveis:**
- Cadastro completo de profissionais
- Definição de horários de trabalho
- Configuração de comissões (% ou fixo)
- Vinculação de serviços
- Visualização de relatórios e métricas
- Gestão de bloqueios e folgas

#### Equipe / Profissionais (Role: PROFISSIONAL)

| Aspecto | Descrição |
|---------|-----------|
| **Perfil** | Funcionários do salão (cabeleireiros, manicures, etc.) |
| **Acesso** | Limitado - próprios agendamentos e informações |
| **Responsabilidades** | Atender clientes, registrar serviços realizados |
| **Permissões** | Visualizar própria agenda, atualizar status de atendimentos |

**Funcionalidades Disponíveis:**
- Visualização da própria agenda
- Confirmação de atendimentos
- Visualização de comissões
- Atualização de perfil básico

#### Clientes (Role: CLIENTE)

| Aspecto | Descrição |
|---------|-----------|
| **Perfil** | Consumidores dos serviços do salão |
| **Acesso** | Mínimo - agendamento e histórico pessoal |
| **Responsabilidades** | Agendar serviços, avaliar atendimentos |
| **Permissões** | Visualizar profissionais disponíveis, fazer agendamentos |

**Funcionalidades Disponíveis:**
- Visualização de profissionais disponíveis
- Escolha de profissional para agendamento
- Visualização de especialidades e avaliações
- Agendamento online com profissional específico

---

## Diagrama de Relacionamentos

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                                │
│  (Proprietário/Gestor - Acesso Total)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ gerencia
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     PROFISSIONAIS                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Cabeleireiro│  │  Manicure   │  │  Colorista  │   ...    │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                      │ atende
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTES                               │
│  (Agendamentos, Avaliações, Fidelidade)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de Validação - VISÃO GERAL

- [x] Objetivo do sistema definido
- [x] Escopo completo documentado
- [x] Necessidade de gestão de profissionais validada
- [x] Stakeholders definidos (Proprietário, Equipe, Clientes)

---

## 2. OBJETIVOS - Status de Implementação

| Objetivo | Status | Detalhes |
|----------|--------|----------|
| Implementar categorização de profissionais | ✅ Concluído | Enum `CategoriaProfissional` com 14 categorias |
| Criar sistema de gerenciamento de agenda | ✅ Concluído | `HorarioTrabalho` + `BloqueioHorario` |
| Desenvolver controle de serviços | ✅ Concluído | Vinculação M:N profissional-serviço |
| Implementar controle de comissões | ✅ Concluído | `Comissao` + `PagamentoProfissional` |
| Criar sistema de permissões por cargo | ✅ Concluído | `CategoriaProfissionalChecker` + anotações |
| Garantir melhoria na produtividade | ✅ Concluído | Sistema organizado e documentado |

### Arquivos Criados/Modificados

**Backend:**
- `CategoriaProfissional.java` - Enum de categorias
- `CategoriaProfissionalChecker.java` - Verificador de permissões
- `GerenteOrAdmin.java` - Anotação de segurança
- `RecepcionistaOrAdmin.java` - Anotação de segurança
- `V19__add_categoria_profissional.sql` - Migration

**Frontend:**
- `professional.ts` - Types atualizados com categoria
- `professionalService.ts` - Endpoints de categoria

**Documentação:**
- `PROFISSIONAIS_VISAO_GERAL.md` - Este documento
- `PERMISSOES_POR_CATEGORIA.md` - Matriz de permissões

---

*Documento criado em: 2026-03-30*
*Sistema: Belezza - Gestão de Salão de Beleza*
