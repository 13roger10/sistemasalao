# Belezza API - Quick Start Guide

Guia rápido para iniciar o Belezza API em poucos minutos.

## 🚀 Início Rápido (5 minutos)

### Pré-requisitos

Certifique-se de ter instalado:
- [Docker](https://docs.docker.com/get-docker/) (versão 20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (versão 2+)

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/your-org/belezza.ai.git
cd belezza.ai/belezza-api
```

### Passo 2: Configurar Variáveis de Ambiente

```bash
# Usar configuração padrão de desenvolvimento
# Nenhuma ação necessária - valores padrão já estão configurados

# Opcional: Criar .env customizado
cp .env.example .env
# Editar .env conforme necessário
```

### Passo 3: Iniciar a Aplicação

```bash
# Opção 1: Usar script automático (recomendado)
chmod +x scripts/deploy/deploy-local.sh
./scripts/deploy/deploy-local.sh

# Opção 2: Docker Compose direto
docker-compose up -d

# Opção 3: Com monitoramento completo
docker-compose --profile monitoring up -d
```

### Passo 4: Verificar Status

```bash
# Verificar se todos os containers estão rodando
docker-compose ps

# Verificar logs
docker-compose logs -f api

# Testar health check
curl http://localhost:8080/actuator/health
```

### Passo 5: Acessar a Aplicação

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **API** | http://localhost:8080 | - |
| **Swagger UI** | http://localhost:8080/swagger-ui.html | - |
| **Actuator** | http://localhost:8080/actuator | - |
| **PostgreSQL** | localhost:5432 | belezza / belezza_dev |
| **Redis** | localhost:6379 | - |
| **PgAdmin** | http://localhost:5050 | admin@belezza.ai / admin |
| **Redis Commander** | http://localhost:8081 | - |
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Zipkin** | http://localhost:9411 | - |

---

## 🧪 Testando a API

### 1. Health Check

```bash
curl http://localhost:8080/actuator/health
```

Resposta esperada:
```json
{
  "status": "UP"
}
```

### 2. Criar Usuário

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@example.com",
    "senha": "senha123",
    "telefone": "+5511999999999"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "senha": "senha123"
  }'
```

Resposta:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "expiresIn": 900000
}
```

### 4. Usar Token

```bash
# Salvar token
export TOKEN="seu-token-aqui"

# Fazer requisição autenticada
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Visualizar Métricas

### Prometheus

1. Acessar http://localhost:9090
2. No campo de query, testar:
   ```promql
   # Taxa de requisições
   rate(http_server_requests_seconds_count[5m])

   # Uso de memória
   jvm_memory_used_bytes{area="heap"}

   # Conexões de banco
   hikaricp_connections_active
   ```

### Grafana

1. Acessar http://localhost:3000
2. Login: `admin` / `admin`
3. Navegar para **Dashboards** → **Belezza**
4. Visualizar:
   - **Application Overview**: Métricas de sistema e performance
   - **Business Metrics**: Métricas de negócio

### Zipkin

1. Acessar http://localhost:9411
2. Fazer algumas requisições à API
3. Clicar em "Run Query" para ver traces
4. Explorar traces para análise de performance

---

## 🛠️ Comandos Úteis

### Docker Compose

```bash
# Iniciar serviços
docker-compose up -d

# Iniciar com monitoramento
docker-compose --profile monitoring up -d

# Iniciar com ferramentas de administração
docker-compose --profile tools up -d

# Ver logs
docker-compose logs -f
docker-compose logs -f api

# Parar serviços
docker-compose down

# Parar e remover volumes (cuidado!)
docker-compose down -v

# Recriar apenas a API
docker-compose up -d --force-recreate api

# Ver status dos containers
docker-compose ps
```

### Maven

```bash
# Compilar
./mvnw clean compile

# Rodar testes
./mvnw test

# Rodar testes de integração
./mvnw verify

# Gerar JAR
./mvnw package

# Rodar aplicação diretamente
./mvnw spring-boot:run

# Pular testes
./mvnw package -DskipTests
```

### Database

```bash
# Acessar PostgreSQL via docker
docker-compose exec db psql -U belezza -d belezza_dev

# Listar tabelas
\dt

# Ver dados de uma tabela
SELECT * FROM usuarios LIMIT 10;

# Sair do psql
\q
```

### Redis

```bash
# Acessar Redis CLI
docker-compose exec redis redis-cli

# Ver todas as chaves
KEYS *

# Ver valor de uma chave
GET chave

# Flush cache (cuidado!)
FLUSHALL

# Sair do redis-cli
exit
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs api

# Verificar status
docker-compose ps

# Recriar container
docker-compose up -d --force-recreate api
```

### Porta já em uso

```bash
# Verificar o que está usando a porta 8080
lsof -i :8080  # MacOS/Linux
netstat -ano | findstr :8080  # Windows

# Matar processo (MacOS/Linux)
kill -9 <PID>

# Ou mudar porta no docker-compose.yml
ports:
  - "8081:8080"  # Usar 8081 externamente
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps db

# Verificar logs do banco
docker-compose logs db

# Recriar banco de dados
docker-compose down
docker volume rm belezza-postgres-data
docker-compose up -d
```

### Erro de memória

```bash
# Aumentar memória do Docker (Desktop)
# Settings → Resources → Memory → Aumentar para 4GB+

# Ou reduzir heap da JVM no Dockerfile
ENV JAVA_OPTS="-Xms256m -Xmx512m"
```

### Limpar tudo e recomeçar

```bash
# CUIDADO: Isso remove todos os dados!
docker-compose down -v
docker system prune -a
docker-compose up -d
```

---

## 📚 Próximos Passos

1. **Explorar a API**:
   - Acessar Swagger UI: http://localhost:8080/swagger-ui.html
   - Testar endpoints
   - Ler a documentação da API

2. **Configurar integrações**:
   - WhatsApp (Meta Cloud API)
   - Instagram/Facebook (Meta Graph API)
   - OpenAI
   - AWS S3
   - Replicate AI

3. **Executar testes**:
   ```bash
   # Testes unitários
   ./mvnw test

   # Testes de integração
   ./mvnw verify

   # Testes de carga
   ./mvnw gatling:test
   ```

4. **Configurar CI/CD**:
   - Ler [DEPLOYMENT.md](DEPLOYMENT.md)
   - Configurar secrets no GitHub
   - Fazer primeiro deploy

5. **Monitoramento avançado**:
   - Ler [MONITORING.md](MONITORING.md)
   - Configurar alertas
   - Criar dashboards customizados

---

## 🆘 Precisa de Ajuda?

- 📖 **Documentação Completa**: [DEPLOYMENT.md](DEPLOYMENT.md)
- 📊 **Guia de Monitoramento**: [MONITORING.md](MONITORING.md)
- 🧪 **Guia de Testes**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- 🐛 **Issues**: https://github.com/your-org/belezza.ai/issues
- 💬 **Slack**: #belezza-dev

---

## ✅ Checklist Pós-Instalação

- [ ] Aplicação rodando em http://localhost:8080
- [ ] Health check retorna status UP
- [ ] Swagger UI acessível
- [ ] Login funcional
- [ ] Database conectado
- [ ] Redis funcionando
- [ ] Métricas disponíveis no Prometheus
- [ ] Dashboards visíveis no Grafana
- [ ] Traces aparecendo no Zipkin

**Parabéns! 🎉 Você está pronto para desenvolver!**
