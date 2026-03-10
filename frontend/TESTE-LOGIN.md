# 🔍 Teste de Login - Guia Passo a Passo

## ✅ Correções Aplicadas

1. **API Route corrigida** - Removida dependência de variáveis NEXT_PUBLIC_* que não funcionam em API Routes
2. **Logs adicionados** - Para debug completo do fluxo
3. **Backend testado** - Funcionando 100% (teste com curl passou)

---

## 🚀 Passos para Testar

### 1. Reinicie o Next.js

**IMPORTANTE**: Você DEVE reiniciar para carregar as mudanças na API route!

No terminal do Next.js:
1. Pressione **Ctrl+C**
2. Execute:
```powershell
cd "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai"
npm run dev
```

3. Aguarde ver: `✓ Ready in X.Xs`

---

### 2. Teste o Login

1. Abra: **http://localhost:3000/login**
2. Abra o Console do navegador (F12)
3. Digite:
   - **Email**: `admin@belezza.ai`
   - **Senha**: `Admin@2024`
4. Clique em **Entrar**

---

## 🔍 Logs Esperados

### No Console do Navegador (F12):
```
[Auth Service] Calling API route with: { email: "admin@belezza.ai" }
[Auth Service] API route response status: 200
[Auth Service] Login successful: { userId: "1", email: "admin@belezza.ai" }
```

### No Terminal do Next.js:
```
[API Login] Received credentials: { email: 'admin@belezza.ai' }
[API Login] Backend URL: http://localhost:8080/api
[API Login] Backend response status: 200
[API Login] Backend data received: { hasUser: true, hasToken: true }
[API Login] Cookie set successfully
[API Login] Returning frontend response
[Middleware] Path: /admin/welcome, Token exists: true
[Middleware] Token found, allowing access to protected route
```

---

## ❌ Se ainda der erro

### 1. Verifique se o backend está rodando:
```powershell
curl http://localhost:8080/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@belezza.ai","password":"Admin@2024"}'
```

Deve retornar JSON com `accessToken`.

### 2. Limpe o cache:
```powershell
# Pare o Next.js (Ctrl+C)
Remove-Item -Recurse -Force .next
npm run dev
```

### 3. Limpe os cookies do navegador:
- F12 > Application > Cookies > http://localhost:3000
- Clique com botão direito > Clear

---

## ✨ O Que Mudou

| Antes | Depois |
|-------|--------|
| API route usava `process.env.NEXT_PUBLIC_API_URL` ❌ | URL hardcoded `http://localhost:8080/api` ✅ |
| Sem logs de debug | Logs completos em cada etapa ✅ |
| Erro de "credenciais inválidas" | Backend testado e funcionando ✅ |

---

## 📝 Credenciais

- **Email**: `admin@belezza.ai`
- **Senha**: `Admin@2024`
- **Após login**: Será redirecionado para `/admin/welcome`
