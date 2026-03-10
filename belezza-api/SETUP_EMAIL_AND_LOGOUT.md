# 🚀 Guia Rápido: Configurar Email e Logout

## ⚙️ Configuração Rápida

### 1. Desenvolvimento (Email Desabilitado)

```bash
# .env ou variáveis de ambiente
MAIL_ENABLED=false
REDIS_ENABLED=false
```

Com essa configuração:
- ✅ Emails serão apenas logados (não enviados)
- ✅ Logout funcionará client-side (sem blacklist)
- ✅ Ideal para desenvolvimento local

---

### 2. Desenvolvimento (Com MailHog)

```bash
# Iniciar MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# .env
MAIL_ENABLED=true
MAIL_HOST=localhost
MAIL_PORT=1025
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

Acessar interface MailHog: http://localhost:8025

---

### 3. Produção (Gmail SMTP)

```bash
# .env
MAIL_ENABLED=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-app
MAIL_FROM=noreply@belezza.ai
FRONTEND_URL=https://belezza.ai

REDIS_ENABLED=true
REDIS_HOST=seu-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=sua-senha-redis
```

**Importante:** Use uma senha de aplicativo do Gmail, não sua senha normal.

Como criar senha de aplicativo no Gmail:
1. Acesse https://myaccount.google.com/security
2. Ative "Verificação em duas etapas"
3. Vá em "Senhas de app"
4. Gere uma senha para "Outro (nome personalizado)"
5. Use essa senha no `MAIL_PASSWORD`

---

### 4. Produção (Outros Provedores SMTP)

**SendGrid:**
```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxx
```

**AWS SES:**
```bash
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=seu-access-key
MAIL_PASSWORD=sua-secret-key
```

**Mailgun:**
```bash
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@seu-dominio.mailgun.org
MAIL_PASSWORD=sua-senha-mailgun
```

---

## 📧 Testar Emails

### 1. Registro de Usuário
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "Senha@123",
    "nome": "Teste Usuario",
    "role": "CLIENTE"
  }'
```
✉️ **Email enviado:** Verificação de email

---

### 2. Verificar Email
```bash
# Pegar token do email recebido
curl -X GET "http://localhost:8080/api/auth/verify-email?token=<token-do-email>"
```
✉️ **Email enviado:** Boas-vindas

---

### 3. Recuperação de Senha
```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@belezza.ai"}'
```
✉️ **Email enviado:** Link de reset de senha

---

### 4. Resetar Senha
```bash
# Pegar token do email recebido
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-do-email>",
    "newPassword": "NovaSenha@123"
  }'
```

---

## 🔐 Testar Logout com Blacklist

### 1. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@belezza.ai",
    "password": "Admin@2024"
  }'
```

**Resposta:**
```json
{
  "user": {...},
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900000
}
```

Copie o `accessToken` para os próximos comandos.

---

### 2. Usar Token (Deve Funcionar)
```bash
TOKEN="seu-access-token"

curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:** ✅ Dados do usuário

---

### 3. Logout
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

### 4. Tentar Usar Token Novamente (Deve Falhar)
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:** ❌ 401 Unauthorized

---

## 🐛 Troubleshooting

### Emails não estão sendo enviados

1. **Verificar se está habilitado:**
   ```bash
   # Logs do Spring Boot devem mostrar:
   [EmailService] Email sending disabled. Would send...
   # ou
   [EmailService] Password reset email sent to: ...
   ```

2. **Verificar configuração SMTP:**
   ```bash
   # Teste manual de SMTP
   telnet smtp.gmail.com 587
   ```

3. **Verificar credenciais:**
   - Gmail: use senha de aplicativo
   - Outros: verifique username/password

4. **Verificar firewall:**
   - Porta 587 (STARTTLS) deve estar aberta
   - Porta 465 (SSL) alternativa

---

### Token não está sendo bloqueado no logout

1. **Verificar se Redis está rodando:**
   ```bash
   redis-cli ping
   # Resposta esperada: PONG
   ```

2. **Verificar logs:**
   ```bash
   # Deve aparecer nos logs:
   [TokenBlacklistService] Token added to blacklist
   [JwtAuthenticationFilter] Token is blacklisted
   ```

3. **Verificar no Redis:**
   ```bash
   redis-cli
   > KEYS auth:blacklist:*
   > TTL auth:blacklist:eyJhbGc...
   ```

4. **Se Redis não disponível:**
   - Sistema usa fallback NoOp
   - Logout funciona client-side apenas
   - Token expira naturalmente após 15min

---

### Erro "ClassNotFoundException: javax.mail"

**Solução:** Dependência foi adicionada ao `pom.xml`, recompilar:
```bash
./mvnw clean install -DskipTests
```

---

### Erro "AsyncUncaughtExceptionHandler"

**Causa:** Emails sendo enviados de forma assíncrona

**Solução:** Verificar `AsyncConfig.java` está configurado:
```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    // ...
}
```

---

## 📝 Checklist de Produção

Antes de fazer deploy em produção:

- [ ] Configurar SMTP de produção (não usar Gmail pessoal)
- [ ] Testar envio de email em staging
- [ ] Configurar Redis de produção (não usar localhost)
- [ ] Testar logout com blacklist em staging
- [ ] Configurar `FRONTEND_URL` corretamente
- [ ] Configurar `MAIL_FROM` com domínio próprio
- [ ] Verificar TTL dos tokens no Redis
- [ ] Configurar SSL/TLS no Redis
- [ ] Monitorar logs de email (sucesso/falha)
- [ ] Configurar alertas para falhas de email

---

## 🎯 Resumo das URLs

| Endpoint | Método | Funcionalidade |
|----------|--------|----------------|
| `/api/auth/register` | POST | Registrar usuário (envia email verificação) |
| `/api/auth/verify-email?token=...` | GET | Verificar email (envia boas-vindas) |
| `/api/auth/forgot-password` | POST | Solicitar reset (envia email) |
| `/api/auth/reset-password` | POST | Resetar senha com token |
| `/api/auth/login` | POST | Login (gera tokens) |
| `/api/auth/logout` | POST | Logout (blacklist token) |
| `/api/auth/me` | GET | Perfil atual (requer auth) |
| `/api/auth/refresh` | POST | Refresh token |

---

## ✅ Tudo Pronto!

Agora você tem:
- ✅ Sistema de email completo
- ✅ Logout seguro com blacklist
- ✅ Configuração por ambiente
- ✅ Fallback gracioso

**Próximo passo:** Testar em staging antes de produção! 🚀
