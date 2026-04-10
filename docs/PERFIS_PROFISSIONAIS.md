# Perfis de Profissionais - Sistema Belezza

## Visão Geral

O sistema suporta múltiplos perfis de profissionais, cada um com categorias, níveis de experiência e serviços específicos.

---

## Categorias de Profissionais

| Categoria | Descrição | Serviços Típicos |
|-----------|-----------|------------------|
| `PROPRIETARIO` | Proprietário/Gestor | Acesso administrativo completo |
| `GERENTE` | Gerente | Gestão operacional |
| `RECEPCIONISTA` | Recepcionista | Agendamentos, atendimento |
| `CABELEIREIRO` | Cabeleireiro(a) | Corte, escova, tratamentos capilares |
| `COLORISTA` | Colorista | Coloração, mechas, balayage, correção |
| `MANICURE_PEDICURE` | Manicure/Pedicure | Esmaltação, cuticulagem, spa dos pés |
| `NAIL_DESIGNER` | Nail Designer | Alongamento, nail art |
| `MAQUIADOR` | Maquiador(a) | Maquiagem social, noiva, eventos |
| `DESIGNER_SOBRANCELHAS` | Designer de Sobrancelhas | Design, henna, micropigmentação |
| `LASH_DESIGNER` | Lash Designer | Extensão de cílios, lash lifting |
| `ESTETICISTA` | Esteticista | Limpeza de pele, massagens, drenagem |
| `BARBEIRO` | Barbeiro | Barba, corte masculino |
| `AUXILIAR` | Auxiliar de Salão | Lavagem, apoio, organização |
| `OUTRO` | Outro | Categoria customizada |

---

## Níveis de Experiência

| Nível | Descrição | Experiência |
|-------|-----------|-------------|
| `JUNIOR` | Júnior | Até 2 anos de experiência |
| `PLENO` | Pleno | 2-5 anos de experiência |
| `SENIOR` | Sênior | Mais de 5 anos de experiência |
| `ESPECIALISTA` | Especialista | Expert reconhecido na área |
| `MASTER` | Master | Referência no mercado, formador |

---

## Perfis Detalhados

### Proprietário / Gestor
**Categoria:** `PROPRIETARIO`
**Role:** `ADMIN`

**Funcionalidades:**
- [x] Acesso administrativo completo
- [x] Controle financeiro (comissões, pagamentos)
- [x] Contratação de equipe (criar profissionais)
- [x] Definição de preços e serviços
- [x] Área de relatórios (Dashboard)

### Gerente
**Categoria:** `GERENTE`
**Role:** `PROFISSIONAL` com permissões elevadas

**Funcionalidades:**
- [x] Gestão operacional
- [x] Acesso a relatórios
- [x] Gestão de equipe (via @GerenteOrAdmin)
- [x] Configuração de horários
- [x] Visualização de comissões

### Recepcionista / Atendimento
**Categoria:** `RECEPCIONISTA`
**Role:** `PROFISSIONAL` com permissões de recepção

**Funcionalidades:**
- [x] Tela de agendamento
- [x] Organização da agenda
- [x] Recebimento de pagamentos (via @RecepcionistaOrAdmin)
- [x] Confirmação de horários
- [ ] Integração WhatsApp (pendente)

### Cabeleireiro(a)
**Categoria:** `CABELEIREIRO`

**Serviços Vinculados:**
- Corte Feminino
- Corte Masculino
- Escova Simples
- Escova Progressiva
- Hidratação Capilar
- Cauterização
- Botox Capilar

**Níveis:**
- Júnior, Pleno, Sênior

### Colorista
**Categoria:** `COLORISTA`

**Serviços Vinculados:**
- Coloração Completa
- Retoque de Raiz
- Mechas/Luzes
- Balayage
- Ombré Hair
- Descoloração
- Correção de Cor
- Consultoria de Cor

**Especializações:**
- Colorimetria avançada
- Técnicas de descoloração

### Manicure / Pedicure
**Categoria:** `MANICURE_PEDICURE`

**Serviços Vinculados:**
- Manicure Simples
- Pedicure Simples
- Manicure + Pedicure
- Esmaltação em Gel
- Spa dos Pés

### Nail Designer
**Categoria:** `NAIL_DESIGNER`

**Serviços Vinculados:**
- Alongamento em Gel
- Alongamento em Fibra
- Alongamento Acrílico
- Manutenção Alongamento
- Nail Art Simples
- Nail Art Elaborada

### Maquiador(a)
**Categoria:** `MAQUIADOR`

**Serviços Vinculados:**
- Maquiagem Social
- Maquiagem para Noiva
- Maquiagem para Festa
- Maquiagem Profissional
- Automaquiagem (Aula)

### Designer de Sobrancelhas
**Categoria:** `DESIGNER_SOBRANCELHAS`

**Serviços Vinculados:**
- Design de Sobrancelhas
- Henna nas Sobrancelhas
- Micropigmentação Sobrancelha
- Retoque Micropigmentação

### Lash Designer
**Categoria:** `LASH_DESIGNER`

**Serviços Vinculados:**
- Extensão de Cílios Clássica
- Extensão de Cílios Volume
- Manutenção de Cílios
- Lash Lifting
- Lash Lifting + Tintura

### Esteticista
**Categoria:** `ESTETICISTA`

**Serviços Vinculados:**
- Limpeza de Pele
- Peeling Facial
- Hidratação Facial
- Drenagem Linfática Facial
- Drenagem Linfática Corporal
- Massagem Relaxante
- Massagem Modeladora

### Barbeiro
**Categoria:** `BARBEIRO`

**Serviços Vinculados:**
- Barba Completa
- Corte + Barba
- Barboterapia
- Pigmentação de Barba

### Auxiliar de Salão
**Categoria:** `AUXILIAR`

**Funcionalidades:**
- [x] Apoio (lavagem de cabelos)
- [x] Visualização de tarefas
- [ ] Controle de materiais (pendente)
- [ ] Tarefas de organização (pendente)

---

## APIs Implementadas

### Categorias
```
GET /api/profissionais/categorias - Lista todas as categorias
GET /api/profissionais/salon/{salonId}/categorias - Categorias do salão
GET /api/profissionais/salon/{salonId}/categoria/{categoria} - Profissionais por categoria
```

### Níveis
```
GET /api/profissionais/niveis - Lista todos os níveis de experiência
```

### CRUD Profissionais
```
POST /api/profissionais - Criar (com categoria, nível, especializações)
PUT /api/profissionais/{id} - Atualizar
GET /api/profissionais/{id} - Buscar por ID
GET /api/profissionais/salon/{salonId} - Listar por salão
DELETE /api/profissionais/{id} - Desativar
PUT /api/profissionais/{id}/reativar - Reativar
```

---

## Campos do Profissional

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `categoria` | Enum | Categoria do profissional |
| `nivel` | Enum | Nível de experiência |
| `especialidade` | String | Especialidade principal |
| `especializacoes` | String | Lista de especializações (vírgula) |
| `bio` | String | Biografia/descrição |
| `tipoComissao` | Enum | PORCENTAGEM ou FIXO |
| `valorComissao` | Decimal | Valor da comissão |
| `aceitaAgendamentoOnline` | Boolean | Aceita agendamento online |
| `servicos` | List | Serviços vinculados |
| `horarios` | List | Horários de trabalho |

---

## Checklist de Implementação

### Perfil Proprietário/Gestor
- [x] Acesso administrativo completo
- [x] Controle financeiro
- [x] Contratação de equipe
- [x] Definição de preços e serviços
- [x] Área de estratégia/relatórios

### Perfil Recepcionista
- [x] Tela de agendamento
- [x] Organização da agenda
- [x] Recebimento de pagamentos
- [x] Confirmação de horários
- [ ] Atendimento WhatsApp (pendente)

### Perfis Técnicos
- [x] Vinculação de serviços por categoria
- [x] Níveis (Júnior/Pleno/Sênior)
- [x] Seed de serviços padrão

### Perfil Auxiliar
- [x] Função de apoio
- [ ] Controle de materiais
- [ ] Tarefas de organização

### Perfil Gerente
- [x] Permissões de gestão
- [x] Acesso a relatórios
- [x] Gestão de equipe

---

## Migrations Criadas

| Versão | Arquivo | Descrição |
|--------|---------|-----------|
| V19 | `V19__add_categoria_profissional.sql` | Campo categoria |
| V20 | `V20__add_nivel_profissional.sql` | Campo nível e especializações |
| V21 | `V21__seed_servicos_por_categoria.sql` | Serviços padrão por categoria |

---

*Documento criado em: 2026-03-30*
*Sistema: Belezza - Gestão de Salão de Beleza*
