# 🚀 Como Iniciar o Belezza.ai

## ✅ Correções Aplicadas
- Middleware corrigido (`middleware.ts`)
- Login agora força reload completo (garante que cookie seja enviado)
- Backend configurado corretamente

## 📝 Credenciais de Login
- **Email**: `admin@belezza.ai`
- **Senha**: `Admin@2024`

---

## 🔴 PASSO 1: Iniciar Backend (Java)

### Abra PowerShell como Administrador e execute:

```powershell
cd "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai"
.\start-backend.ps1
```

**OU manualmente**:
```powershell
$env:JAVA_HOME = "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai\belezza-api\tools\jdk-21.0.4"
cd "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai\belezza-api"
& "$env:JAVA_HOME\bin\java.exe" -jar target\belezza-api-1.0.0-SNAPSHOT.jar --spring.profiles.active=test
```

**Aguarde ver**: `{"service":"belezza-api","status":"UP"...}`

---

## 🟢 PASSO 2: Iniciar Frontend (Next.js)

### Em OUTRO PowerShell, execute:

```powershell
cd "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai"
npm run dev
```

**Aguarde ver**: `✓ Ready in X.Xs`

---

## 🌐 PASSO 3: Acessar o Sistema

1. Abra o navegador: **http://localhost:3000/login**
2. Digite:
   - Email: `admin@belezza.ai`
   - Senha: `Admin@2024`
3. Clique em **Entrar**
4. Você será redirecionado para: **/admin/welcome**

---

## 🔍 Se ainda não funcionar

### Verifique os logs no terminal do Next.js:

Você deve ver:
```
[Middleware] Path: /login, Token exists: false
[Middleware] Path: /admin/welcome, Token exists: true
[Middleware] Token found, allowing access to protected route
```

Se ver `Token exists: false` ao acessar `/admin/welcome`:
1. Abra DevTools do navegador (F12)
2. Vá em Application > Cookies > http://localhost:3000
3. Verifique se existe um cookie chamado `auth_token`
4. Se NÃO existir, me avise - há um problema com o CORS ou configuração de cookies

---

## 📊 URLs Importantes

| Serviço | URL |
|---------|-----|
| Login Frontend | http://localhost:3000/login |
| Dashboard | http://localhost:3000/admin/dashboard |
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| H2 Console | http://localhost:8080/h2-console |

---

## 🛑 Parar os Serviços

- **Backend**: Pressione `Ctrl+C` no terminal do Java
- **Frontend**: Pressione `Ctrl+C` no terminal do Next.js
