# Sistema de Permissões por Categoria de Profissional

## Visão Geral

O sistema Belezza implementa um modelo de permissões em dois níveis:

1. **Nível de Role (Usuário)**: ADMIN, PROFISSIONAL, CLIENTE
2. **Nível de Categoria (Profissional)**: Permissões granulares por tipo de profissional

---

## Roles de Usuário

| Role | Descrição | Acesso |
|------|-----------|--------|
| `ADMIN` | Administrador do Salão | Acesso total ao sistema |
| `PROFISSIONAL` | Funcionário do Salão | Acesso limitado baseado na categoria |
| `CLIENTE` | Cliente do Salão | Acesso mínimo (agendamentos próprios) |

---

## Categorias de Profissional e Permissões

### Hierarquia de Permissões

```
PROPRIETARIO (Nível 1 - Máximo)
    └── Acesso total, equivalente a ADMIN

GERENTE (Nível 2)
    └── Gestão operacional, relatórios, equipe

RECEPCIONISTA (Nível 3)
    └── Agendamentos, atendimento, pagamentos

CABELEIREIRO, COLORISTA, MANICURE, etc. (Nível 4)
    └── Própria agenda, serviços, clientes

AUXILIAR (Nível 5)
    └── Apoio, visualização limitada
```

### Matriz de Permissões por Categoria

| Funcionalidade | PROPRIETARIO | GERENTE | RECEPCIONISTA | PROFISSIONAL* | AUXILIAR |
|----------------|:------------:|:-------:|:-------------:|:-------------:|:--------:|
| **Gestão de Profissionais** |
| Cadastrar profissional | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar profissional | ✅ | ✅ | ❌ | Próprio | ❌ |
| Desativar profissional | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todos profissionais | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agendamentos** |
| Criar agendamento | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar agendamento | ✅ | ✅ | ✅ | Próprio | ❌ |
| Cancelar agendamento | ✅ | ✅ | ✅ | Próprio | ❌ |
| Ver todos agendamentos | ✅ | ✅ | ✅ | Próprio | ❌ |
| **Financeiro** |
| Ver comissões | ✅ | ✅ | ❌ | Próprias | ❌ |
| Processar pagamentos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Relatórios financeiros | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Clientes** |
| Cadastrar cliente | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver histórico cliente | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Serviços** |
| Cadastrar serviço | ✅ | ✅ | ❌ | ❌ | ❌ |
| Definir preços | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Configurações** |
| Configurar salão | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Horários** |
| Definir próprio horário | ✅ | ✅ | ✅ | ✅ | ✅ |
| Definir horário de outros | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar bloqueios (férias) | ✅ | ✅ | ✅ | Próprio | Próprio |

*PROFISSIONAL = Cabeleireiro, Colorista, Manicure, Maquiador, Esteticista, etc.

---

## Anotações de Segurança

### Anotações Disponíveis

| Anotação | Descrição | Roles/Categorias Permitidos |
|----------|-----------|----------------------------|
| `@AdminOnly` | Apenas ADMIN | ADMIN |
| `@GerenteOrAdmin` | Gestão operacional | ADMIN, PROPRIETARIO, GERENTE |
| `@RecepcionistaOrAdmin` | Operações de atendimento | ADMIN, PROPRIETARIO, GERENTE, RECEPCIONISTA |
| `@ProfissionalOrAdmin` | Qualquer profissional | ADMIN, PROFISSIONAL |
| `@Authenticated` | Qualquer usuário logado | Todos autenticados |

### Uso nas APIs

```java
// Apenas admin pode acessar
@AdminOnly
@PostMapping("/profissionais")
public ResponseEntity<?> criar(...) { }

// Gerentes e admins podem gerenciar equipe
@GerenteOrAdmin
@PutMapping("/profissionais/{id}/comissao")
public ResponseEntity<?> atualizarComissao(...) { }

// Recepcionistas podem gerenciar agendamentos
@RecepcionistaOrAdmin
@PostMapping("/agendamentos")
public ResponseEntity<?> criarAgendamento(...) { }

// Qualquer profissional pode ver própria agenda
@ProfissionalOrAdmin
@GetMapping("/minha-agenda")
public ResponseEntity<?> minhaAgenda(...) { }
```

---

## Verificação Programática

O serviço `CategoriaProfissionalChecker` pode ser usado para verificações programáticas:

```java
@Autowired
private CategoriaProfissionalChecker checker;

public void algumMetodo(Authentication auth) {
    if (checker.isGerente(auth)) {
        // Lógica para gerentes
    }

    Optional<CategoriaProfissional> categoria = checker.getCategoria(auth);
    // Usar a categoria para lógica condicional
}
```

---

## Implementação Técnica

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `CategoriaProfissional.java` | Enum com todas as categorias |
| `CategoriaProfissionalChecker.java` | Serviço de verificação de categoria |
| `GerenteOrAdmin.java` | Anotação para nível gerencial |
| `RecepcionistaOrAdmin.java` | Anotação para nível de recepção |

### Fluxo de Verificação

```
Request → Security Filter → @PreAuthorize
                              ↓
                    CategoriaProfissionalChecker
                              ↓
                    Verifica usuário → profissional → categoria
                              ↓
                    Permite ou nega acesso
```

---

## Checklist de Validação

- [x] Categorias de profissional definidas (enum)
- [x] Verificador de categoria implementado
- [x] Anotações de segurança criadas
- [x] Hierarquia de permissões documentada
- [x] Matriz de permissões por categoria

---

*Documento criado em: 2026-03-30*
*Sistema: Belezza - Gestão de Salão de Beleza*
