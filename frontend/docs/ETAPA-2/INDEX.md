# ETAPA 2 - SEGURANCA E AUTENTICACAO
## Belezza.ai - Backend Java

---

## STATUS: CONCLUIDA

| Tarefa | Descricao | Status |
|--------|-----------|--------|
| T2.1.1-3 | Spring Security Config (SecurityConfig, CORS, CSRF) | Concluido |
| T2.2.1-4 | JWT Implementation (JwtService, JwtAuthenticationFilter) | Concluido |
| T2.3.1-3 | Sistema de Roles (Role enum, UserDetailsService, anotacoes) | Concluido |
| T2.4.1-7 | Endpoints de Autenticacao (AuthController, DTOs) | Concluido |
| T2.5.1-3 | Protecao de Endpoints (GlobalExceptionHandler, Rate Limiting) | Concluido |

---

## ESTRUTURA CRIADA

### Arquivos de Seguranca

```
belezza-api/src/main/java/com/belezza/api/
├── config/
│   ├── SecurityConfig.java          # Configuracao Spring Security
│   └── CorsConfig.java              # Configuracao CORS
├── security/
│   ├── JwtService.java              # Geracao e validacao JWT
│   ├── JwtAuthenticationFilter.java # Filtro de autenticacao
│   ├── CustomUserDetailsService.java # Carregamento de usuarios
│   ├── RateLimitFilter.java         # Rate limiting por IP
│   └── annotation/
│       ├── AdminOnly.java           # @AdminOnly
│       ├── ProfissionalOrAdmin.java # @ProfissionalOrAdmin
│       └── Authenticated.java       # @Authenticated
├── entity/
│   ├── Usuario.java                 # Entidade de usuario
│   ├── Role.java                    # Enum de roles
│   └── Plano.java                   # Enum de planos
├── repository/
│   └── UsuarioRepository.java       # Repository de usuarios
├── service/
│   └── AuthService.java             # Logica de autenticacao
├── controller/
│   └── AuthController.java          # Endpoints REST
├── dto/
│   ├── auth/
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── RefreshTokenRequest.java
│   │   ├── ForgotPasswordRequest.java
│   │   ├── ResetPasswordRequest.java
│   │   └── AuthResponse.java
│   └── user/
│       └── UserResponse.java
└── exception/
    ├── BusinessException.java
    ├── ResourceNotFoundException.java
    ├── AuthenticationException.java
    ├── DuplicateResourceException.java
    ├── RateLimitExceededException.java
    ├── GlobalExceptionHandler.java
    └── ErrorResponse.java
```

### Migration Flyway

```
belezza-api/src/main/resources/db/migration/
└── V1__create_usuarios_table.sql
```

### Testes

```
belezza-api/src/test/java/com/belezza/api/
├── service/
│   └── AuthServiceTest.java
└── controller/
    └── AuthControllerTest.java
```

---

## ENDPOINTS DE AUTENTICACAO

| Metodo | Endpoint | Descricao | Autenticacao |
|--------|----------|-----------|--------------|
| POST | /api/auth/register | Registrar novo usuario | Nao |
| POST | /api/auth/login | Login de usuario | Nao |
| POST | /api/auth/refresh | Renovar tokens | Nao |
| POST | /api/auth/logout | Logout | Sim |
| GET | /api/auth/me | Perfil do usuario | Sim |
| POST | /api/auth/forgot-password | Solicitar reset de senha | Nao |
| POST | /api/auth/reset-password | Redefinir senha | Nao |
| GET | /api/auth/verify-email | Verificar email | Nao |

---

## SISTEMA DE ROLES

### Roles Disponiveis

| Role | Descricao | Authority |
|------|-----------|-----------|
| ADMIN | Dono do salao | ROLE_ADMIN |
| PROFISSIONAL | Funcionario | ROLE_PROFISSIONAL |
| CLIENTE | Cliente | ROLE_CLIENTE |

### Anotacoes de Autorizacao

```java
// Apenas administradores
@AdminOnly
public void adminMethod() { }

// Profissionais ou administradores
@ProfissionalOrAdmin
public void profissionalMethod() { }

// Qualquer usuario autenticado
@Authenticated
public void authenticatedMethod() { }
```

### Configuracao de Endpoints

```java
// Endpoints publicos
/api/auth/**
/api/public/**

// Apenas ADMIN
/api/admin/**

// ADMIN ou PROFISSIONAL
/api/profissional/**

// Todos autenticados
/api/**
```

---

## CONFIGURACAO JWT

### Propriedades (application.yml)

```yaml
belezza:
  jwt:
    secret: ${JWT_SECRET:...}
    access-token-expiration: 900000     # 15 minutos
    refresh-token-expiration: 604800000 # 7 dias
    issuer: belezza-api
```

### Estrutura do Token

**Access Token Claims:**
- `sub` - Email do usuario
- `userId` - ID do usuario
- `role` - Role do usuario
- `plano` - Plano de assinatura
- `nome` - Nome do usuario
- `iat` - Data de emissao
- `exp` - Data de expiracao
- `iss` - Issuer (belezza-api)

**Refresh Token Claims:**
- `sub` - Email do usuario
- `userId` - ID do usuario
- `tokenType` - "refresh"
- `iat` - Data de emissao
- `exp` - Data de expiracao

---

## RATE LIMITING

### Configuracao

```yaml
belezza:
  rate-limit:
    enabled: true
    requests-per-minute: 60
```

### Funcionamento

- Limite por IP (X-Forwarded-For ou X-Real-IP)
- 60 requisicoes por minuto por padrao
- Retorna HTTP 429 quando excedido
- Header `Retry-After: 60` na resposta

### Endpoints Excluidos

- `/actuator/*`
- `/api/public/health`
- `/api/public/ping`

---

## TRATAMENTO DE ERROS

### Formato de Resposta de Erro

```json
{
  "timestamp": "2024-02-05T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "errorCode": "VALIDATION_ERROR",
  "message": "Erro de validação nos campos informados",
  "path": "/api/auth/register",
  "fieldErrors": {
    "email": "Email deve ser válido",
    "password": "Senha deve ter entre 8 e 100 caracteres"
  }
}
```

### Codigos de Erro

| Codigo | HTTP Status | Descricao |
|--------|-------------|-----------|
| VALIDATION_ERROR | 400 | Erro de validacao |
| BUSINESS_ERROR | 400 | Erro de negocio |
| AUTHENTICATION_ERROR | 401 | Nao autenticado |
| ACCESS_DENIED | 403 | Acesso negado |
| RESOURCE_NOT_FOUND | 404 | Recurso nao encontrado |
| DUPLICATE_RESOURCE | 409 | Recurso duplicado |
| RATE_LIMIT_EXCEEDED | 429 | Limite de requisicoes |
| INTERNAL_ERROR | 500 | Erro interno |

---

## VALIDACOES

### RegisterRequest

| Campo | Validacao |
|-------|-----------|
| email | Obrigatorio, formato email, max 255 chars |
| password | Obrigatorio, 8-100 chars, maiuscula + minuscula + numero |
| nome | Obrigatorio, 2-100 chars |
| telefone | Opcional, formato internacional |
| role | Obrigatorio, enum Role |

### LoginRequest

| Campo | Validacao |
|-------|-----------|
| email | Obrigatorio, formato email |
| password | Obrigatorio |

---

## SEGURANCA

### Medidas Implementadas

1. **Senha Segura**
   - BCrypt com cost factor 12
   - Validacao de complexidade (maiuscula, minuscula, numero)
   - Minimo 8 caracteres

2. **JWT Seguro**
   - Chave HMAC-SHA256 (minimo 256 bits)
   - Tokens de curta duracao (15 min)
   - Refresh tokens separados

3. **Rate Limiting**
   - Bucket4j para limitacao por IP
   - Protecao contra brute force

4. **CORS**
   - Origins configurados por ambiente
   - Credentials habilitado para JWT
   - Preflight caching (1 hora)

5. **Request Tracing**
   - MDC com requestId e userId
   - Header X-Request-Id na resposta

---

## MIGRATION - V1

### Tabela: usuarios

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL |
| nome | VARCHAR(100) | NOT NULL |
| telefone | VARCHAR(20) | - |
| avatar_url | VARCHAR(500) | - |
| role | VARCHAR(20) | NOT NULL, CHECK |
| plano | VARCHAR(20) | NOT NULL, DEFAULT 'FREE' |
| ativo | BOOLEAN | NOT NULL, DEFAULT TRUE |
| email_verificado | BOOLEAN | NOT NULL, DEFAULT FALSE |
| reset_password_token | VARCHAR(100) | - |
| reset_password_expires | TIMESTAMP | - |
| email_verification_token | VARCHAR(100) | - |
| criado_em | TIMESTAMP | NOT NULL |
| atualizado_em | TIMESTAMP | NOT NULL |
| ultimo_login | TIMESTAMP | - |

---

## PROXIMOS PASSOS

1. **ETAPA 3** - Modelagem de Dominio
   - Entidades: Salon, Profissional, Cliente, Servico
   - Entidades: Agendamento, Avaliacao, Pagamento
   - Entidades: Post, ContaSocial
   - Migrations Flyway

2. **Para testar a autenticacao:**
   ```bash
   cd belezza-api
   docker-compose up -d db redis
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```

3. **Testar endpoints:**
   ```bash
   # Registrar usuario
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"Admin123!","nome":"Admin","role":"ADMIN"}'

   # Login
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"Admin123!"}'
   ```

4. **Swagger:**
   - http://localhost:8080/swagger-ui.html

---

*Data de conclusao: 05/02/2026*
