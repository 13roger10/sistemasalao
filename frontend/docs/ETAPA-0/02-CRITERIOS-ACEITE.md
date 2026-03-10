# CRITERIOS DE ACEITE POR MODULO
## Belezza.ai - Backend Java + Spring Boot

---

## MODULO 1: AUTENTICACAO E USUARIOS

### AUTH-01: Registro de Usuario
**Dado** que um visitante acessa a pagina de registro
**Quando** preenche email, senha, nome e telefone validos
**Entao** uma conta e criada e tokens JWT sao retornados

**Criterios:**
- [ ] Email deve ser unico no sistema
- [ ] Senha deve ter minimo 8 caracteres, 1 maiuscula, 1 numero, 1 especial
- [ ] Telefone deve ser validado (formato brasileiro)
- [ ] Email de boas-vindas e enviado
- [ ] Retorna accessToken e refreshToken

### AUTH-02: Login
**Dado** que um usuario cadastrado acessa o login
**Quando** informa email e senha corretos
**Entao** recebe tokens JWT e dados do usuario

**Criterios:**
- [ ] Retorna erro 401 para credenciais invalidas
- [ ] Bloqueia apos 5 tentativas falhas (15 min)
- [ ] Registra IP e timestamp do login
- [ ] Access token expira em 15 minutos
- [ ] Refresh token expira em 7 dias

### AUTH-03: Refresh Token
**Dado** que um usuario tem um refresh token valido
**Quando** solicita renovacao
**Entao** recebe novos tokens

**Criterios:**
- [ ] Invalida refresh token antigo (rotacao)
- [ ] Retorna erro 401 se token expirado
- [ ] Mantem sessao do usuario ativa

### AUTH-04: Recuperacao de Senha
**Dado** que um usuario esqueceu a senha
**Quando** informa email cadastrado
**Entao** recebe link de reset por email

**Criterios:**
- [ ] Link expira em 1 hora
- [ ] Link e de uso unico
- [ ] Nao revela se email existe (seguranca)

---

## MODULO 2: GESTAO DO SALAO

### SALON-01: Cadastro do Salao
**Dado** que um ADMIN esta autenticado
**Quando** cria um novo salao
**Entao** o salao e registrado vinculado ao admin

**Criterios:**
- [ ] Nome obrigatorio (3-100 caracteres)
- [ ] Endereco completo (rua, numero, bairro, cidade, estado, CEP)
- [ ] Telefone validado
- [ ] Logo opcional (max 2MB, JPEG/PNG)
- [ ] Um admin pode ter apenas 1 salao

### SALON-02: Configuracoes do Salao
**Dado** que um ADMIN acessa configuracoes
**Quando** define horarios e regras
**Entao** as configuracoes sao salvas

**Criterios:**
- [ ] Horario de abertura/fechamento por dia da semana
- [ ] Intervalo minimo entre agendamentos (5-60 min)
- [ ] Antecedencia minima para agendar (0-72h)
- [ ] Antecedencia minima para cancelar (0-24h)
- [ ] Dias de folga (feriados personalizados)

### SALON-03: Cadastro de Profissionais
**Dado** que um ADMIN gerencia profissionais
**Quando** adiciona um novo profissional
**Entao** o usuario e vinculado ao salao

**Criterios:**
- [ ] Usuario deve ter role PROFISSIONAL
- [ ] Um profissional pertence a apenas 1 salao
- [ ] Admin pode ativar/desativar profissional
- [ ] Profissional recebe email de convite

---

## MODULO 3: SERVICOS

### SERV-01: Cadastro de Servico
**Dado** que um ADMIN gerencia servicos
**Quando** cria um novo servico
**Entao** o servico e disponibilizado para agendamento

**Criterios:**
- [ ] Nome obrigatorio (3-100 caracteres)
- [ ] Descricao opcional (max 500 caracteres)
- [ ] Preco obrigatorio (> 0)
- [ ] Duracao obrigatoria (15-480 minutos)
- [ ] Categoria obrigatoria (enum TipoServico)
- [ ] Status default: ATIVO

### SERV-03: Ativar/Desativar Servico
**Dado** que um servico existe
**Quando** admin altera o status
**Entao** o servico fica disponivel ou indisponivel

**Criterios:**
- [ ] Servico inativo nao aparece para agendamento
- [ ] Agendamentos existentes nao sao afetados
- [ ] Historico de alteracoes e registrado

---

## MODULO 4: AGENDAMENTO

### AGEND-01: Criar Agendamento
**Dado** que um usuario quer agendar um servico
**Quando** seleciona servico, profissional, data e hora
**Entao** o agendamento e criado se houver disponibilidade

**Criterios:**
- [ ] Valida disponibilidade do profissional
- [ ] Valida horario de funcionamento do salao
- [ ] Calcula horario de termino automaticamente
- [ ] Bloqueia horario para outros agendamentos
- [ ] Envia confirmacao via WhatsApp
- [ ] Status inicial: PENDENTE

### AGEND-02: Validacao de Conflitos
**Dado** que existe um agendamento no horario
**Quando** tenta criar outro no mesmo horario/profissional
**Entao** o sistema rejeita com erro

**Criterios:**
- [ ] Verifica sobreposicao de horarios
- [ ] Considera duracao do servico
- [ ] Considera intervalo entre servicos
- [ ] Retorna horarios alternativos disponiveis

### AGEND-04: Cancelar Agendamento
**Dado** que existe um agendamento futuro
**Quando** cliente ou admin cancela
**Entao** o horario e liberado

**Criterios:**
- [ ] Respeita antecedencia minima para cancelar
- [ ] Registra motivo do cancelamento
- [ ] Notifica profissional via sistema
- [ ] Notifica cliente via WhatsApp
- [ ] Status: CANCELADO

### AGEND-05: Reagendar
**Dado** que existe um agendamento
**Quando** solicita nova data/hora
**Entao** o agendamento e movido se houver disponibilidade

**Criterios:**
- [ ] Valida nova disponibilidade
- [ ] Libera horario antigo
- [ ] Mantem historico de alteracoes
- [ ] Notifica via WhatsApp

### AGEND-08: Regra de No-Show
**Dado** que um agendamento passou do horario
**Quando** cliente nao compareceu
**Entao** o sistema marca como NO_SHOW

**Criterios:**
- [ ] Job executa 15 min apos horario agendado
- [ ] Incrementa contador de no-show do cliente
- [ ] Apos 3 no-shows, bloqueia agendamento online
- [ ] Admin pode desbloquear manualmente

---

## MODULO 5: WHATSAPP

### WPP-01: Confirmacao de Agendamento
**Dado** que um agendamento foi criado
**Quando** o sistema processa
**Entao** envia mensagem de confirmacao

**Criterios:**
- [ ] Mensagem contem: data, hora, servico, profissional, endereco
- [ ] Inclui link para cancelar/reagendar
- [ ] Registra status de envio
- [ ] Retry em caso de falha (max 3x)

### WPP-02: Lembrete 24h
**Dado** que existe agendamento para amanha
**Quando** job de lembretes executa
**Entao** envia lembrete ao cliente

**Criterios:**
- [ ] Envia entre 9h e 21h
- [ ] Nao envia se ja cancelado
- [ ] Inclui link para confirmar presenca
- [ ] Registra envio para nao duplicar

### WPP-05: Link para Cancelar/Reagendar
**Dado** que cliente recebe mensagem
**Quando** clica no link de cancelar
**Entao** pode cancelar sem login

**Criterios:**
- [ ] Token unico e seguro (UUID + hash)
- [ ] Token expira apos o agendamento
- [ ] Valida antecedencia minima
- [ ] Redireciona para pagina de confirmacao

---

## MODULO 6: SOCIAL STUDIO - IMAGENS

### IMG-01: Upload de Imagem
**Dado** que um usuario quer criar post
**Quando** faz upload de imagem
**Entao** a imagem e armazenada no S3

**Criterios:**
- [ ] Aceita JPEG, PNG, WebP
- [ ] Tamanho maximo: 10MB
- [ ] Gera thumbnail (300x300)
- [ ] Retorna URLs assinadas
- [ ] Valida dimensoes minimas (500x500)

### IMG-03: Melhoria com IA
**Dado** que uma imagem foi uploaded
**Quando** solicita enhance
**Entao** a imagem e processada com IA

**Criterios:**
- [ ] Processamento assincrono
- [ ] Notifica conclusao (webhook ou polling)
- [ ] Salva versao original e editada
- [ ] Tempo maximo: 30 segundos
- [ ] Retry em caso de falha

### IMG-04: Remocao de Fundo
**Dado** que uma imagem foi uploaded
**Quando** solicita remocao de fundo
**Entao** retorna imagem com fundo transparente

**Criterios:**
- [ ] Retorna PNG com alpha channel
- [ ] Preserva qualidade do objeto principal
- [ ] Oferece opcao de fundo solido (cor)

### IMG-07: Crops para Redes Sociais
**Dado** que uma imagem foi editada
**Quando** solicita geracao de versoes
**Entao** cria crops otimizados

**Criterios:**
- [ ] 1:1 (1080x1080) - Instagram Feed
- [ ] 4:5 (1080x1350) - Instagram Portrait
- [ ] 9:16 (1080x1920) - Stories/Reels
- [ ] 16:9 (1200x630) - Facebook
- [ ] Centraliza objeto principal (smart crop)

---

## MODULO 7: SOCIAL STUDIO - LEGENDAS

### CAPT-01: Geracao de Legenda com IA
**Dado** que uma imagem esta pronta
**Quando** solicita geracao de legenda
**Entao** retorna texto otimizado

**Criterios:**
- [ ] Considera tipo de servico do salao
- [ ] Considera tom de voz selecionado
- [ ] Considera plataforma destino
- [ ] Tamanho adequado (Instagram: 2200 chars, Facebook: 63206)
- [ ] Inclui emojis relevantes

### CAPT-02: Sugestao de Hashtags
**Dado** que uma legenda foi gerada
**Quando** inclui hashtags
**Entao** retorna tags relevantes

**Criterios:**
- [ ] 20-30 hashtags para Instagram
- [ ] Mix de hashtags populares e nicho
- [ ] Hashtags em portugues (BR)
- [ ] Remove hashtags banidas

---

## MODULO 8: PUBLICACAO SOCIAL

### PUB-01: Conectar Instagram
**Dado** que um admin quer conectar Instagram
**Quando** inicia fluxo OAuth
**Entao** a conta e vinculada ao salao

**Criterios:**
- [ ] Redireciona para Meta OAuth
- [ ] Salva access token criptografado
- [ ] Configura refresh automatico
- [ ] Valida permissoes necessarias
- [ ] Um salao pode ter 1 conta Instagram

### PUB-03: Publicar Post
**Dado** que imagem e legenda estao prontas
**Quando** solicita publicacao
**Entao** o post e enviado para a rede social

**Criterios:**
- [ ] Valida conta conectada e token valido
- [ ] Upload de midia para Meta
- [ ] Cria post via Graph API
- [ ] Retorna ID do post publicado
- [ ] Atualiza status: PUBLICADO

### PUB-04: Agendar Publicacao
**Dado** que um post esta pronto
**Quando** agenda para data futura
**Entao** o post e publicado automaticamente

**Criterios:**
- [ ] Data deve ser futura (minimo 10 min)
- [ ] Maximo 30 dias no futuro
- [ ] Job executa no horario agendado
- [ ] Retry em caso de falha (max 3x)
- [ ] Notifica admin do resultado

---

## MODULO 9: RELATORIOS

### REL-01: Agendamentos por Periodo
**Dado** que um admin acessa relatorios
**Quando** seleciona periodo
**Entao** ve metricas de agendamentos

**Criterios:**
- [ ] Total de agendamentos
- [ ] Agendamentos concluidos
- [ ] Agendamentos cancelados
- [ ] Taxa de no-show
- [ ] Comparativo com periodo anterior
- [ ] Grafico de evolucao

### REL-02: Faturamento
**Dado** que um admin acessa faturamento
**Quando** seleciona periodo
**Entao** ve metricas financeiras

**Criterios:**
- [ ] Total bruto (soma dos servicos)
- [ ] Ticket medio
- [ ] Faturamento por profissional
- [ ] Faturamento por servico
- [ ] Evolucao mensal

---

*Documento: T0.1.2 - Criterios de Aceite*
*Versao: 1.0*
*Data: 05/02/2026*
