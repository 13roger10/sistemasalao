# ETAPA 10 - DEPLOY E MONITORAMENTO

## ✅ Implementação Completa

Esta etapa implementa toda a infraestrutura de deploy e monitoramento para o Belezza API, incluindo containerização, orquestração, CI/CD, observabilidade e documentação completa.

---

## 📋 Resumo da Implementação

### 1. ✅ Monitoramento e Observabilidade

#### Spring Boot Actuator
- **Arquivo**: [application.yml](src/main/resources/application.yml)
- **Configurado**:
  - Health checks (liveness, readiness)
  - Métricas expostas via `/actuator/prometheus`
  - Info, env, loggers endpoints
  - Métricas customizadas (appointments, posts, whatsapp)
  - Distributed tracing com Zipkin
  - Percentis de response time

#### Dependências Adicionadas
- **Arquivo**: [pom.xml](pom.xml)
- **Adicionado**:
  - `micrometer-registry-prometheus` - Exportação de métricas para Prometheus
  - `micrometer-tracing-bridge-brave` - Distributed tracing
  - `zipkin-reporter-brave` - Envio de traces para Zipkin

### 2. ✅ Containerização

#### Dockerfile
- **Arquivo**: [Dockerfile](Dockerfile)
- **Características**:
  - Multi-stage build (otimizado)
  - Imagem base: Eclipse Temurin 21 JRE Alpine
  - Non-root user (segurança)
  - Health check integrado
  - JVM otimizado para containers
  - Heap dump on OutOfMemoryError
  - G1GC configurado

#### .dockerignore
- **Arquivo**: [.dockerignore](.dockerignore)
- **Otimizações**:
  - Exclui arquivos desnecessários do build
  - Reduz tamanho da imagem
  - Acelera o build

### 3. ✅ Orquestração

#### Docker Compose
- **Arquivo**: [docker-compose.yml](docker-compose.yml)
- **Serviços Configurados**:
  - **api**: Belezza API
  - **db**: PostgreSQL 16
  - **redis**: Redis 7
  - **prometheus**: Coleta de métricas (profile: monitoring)
  - **grafana**: Visualização de métricas (profile: monitoring)
  - **zipkin**: Distributed tracing (profile: monitoring)
  - **pgadmin**: Gerenciamento DB (profile: tools)
  - **redis-commander**: Gerenciamento Redis (profile: tools)

**Recursos**:
- Health checks para todos os serviços
- Volumes persistentes
- Network isolada
- Variáveis de ambiente configuráveis
- Profiles para diferentes ambientes

### 4. ✅ Prometheus

#### Configuração
- **Arquivo**: [docker/prometheus/prometheus.yml](docker/prometheus/prometheus.yml)
- **Features**:
  - Scrape da API a cada 10s
  - Auto-discovery de métricas
  - Tags de ambiente
  - Integração com Alertmanager (preparado)

#### Alertas
- **Arquivo**: [docker/prometheus/alerts.yml](docker/prometheus/alerts.yml)
- **Alertas Configurados**:
  - **Critical**: API down, connection pool exhausted
  - **Warning**: High error rate, high response time, high CPU/memory
  - **Business**: High cancellation rate, low appointment rate

### 5. ✅ Grafana

#### Datasources
- **Arquivo**: [docker/grafana/provisioning/datasources/prometheus.yml](docker/grafana/provisioning/datasources/prometheus.yml)
- **Auto-provisionado**: Prometheus como datasource padrão

#### Dashboards
- **Pasta**: [docker/grafana/dashboards/](docker/grafana/dashboards/)
- **Dashboards Criados**:

1. **application-overview.json**
   - Application Status
   - HTTP Request Rate
   - HTTP Response Time (95th, 99th percentile)
   - CPU Usage (system, process)
   - JVM Memory Usage
   - Database Connections
   - JVM Threads
   - Heap Usage %

2. **business-metrics.json**
   - Appointments Created (24h)
   - Cancellation Rate
   - Social Posts Published
   - WhatsApp Messages Sent
   - Appointment Activity (time series)
   - Top API Endpoints (pie chart)
   - HTTP Status Codes (hourly)

**Auto-load**: Dashboards são carregados automaticamente via provisioning

### 6. ✅ CI/CD Pipeline

#### GitHub Actions - CI
- **Arquivo**: [.github/workflows/api-ci.yml](.github/workflows/api-ci.yml)
- **Jobs**:
  1. **build-and-test**:
     - Build com Maven
     - Unit tests
     - Integration tests (com Testcontainers)
     - Code coverage (JaCoCo)
     - Upload para Codecov
  2. **code-quality**:
     - SonarCloud scan
  3. **security-scan**:
     - OWASP Dependency Check
  4. **build-docker**:
     - Build da imagem Docker
     - Push para Docker Hub (só em main)
     - Multi-arch support

#### GitHub Actions - CD
- **Arquivo**: [.github/workflows/api-cd.yml](.github/workflows/api-cd.yml)
- **Jobs**:
  1. **deploy-staging**:
     - Deploy automático para staging
     - Health check
     - Notificação Slack
  2. **deploy-production**:
     - Requer aprovação manual (GitHub Environment)
     - Deploy para produção
     - Health check
     - Criação de release
     - Notificação Slack

**Secrets Necessários**:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `STAGING_SERVER_HOST`, `STAGING_SERVER_USER`, `STAGING_SERVER_SSH_KEY`
- `PRODUCTION_SERVER_HOST`, `PRODUCTION_SERVER_USER`, `PRODUCTION_SERVER_SSH_KEY`
- `SLACK_WEBHOOK_URL`
- `SONAR_TOKEN`, `CODECOV_TOKEN`

### 7. ✅ Scripts de Deploy

#### Deploy Local
- **Arquivo**: [scripts/deploy/deploy-local.sh](scripts/deploy/deploy-local.sh)
- **Funcionalidade**:
  - Valida Docker e docker-compose
  - Build da aplicação
  - Start de todos os serviços
  - Health checks automáticos
  - Exibe URLs de acesso

#### Deploy Produção
- **Arquivo**: [scripts/deploy/deploy-production.sh](scripts/deploy/deploy-production.sh)
- **Funcionalidade**:
  - Validação de configuração
  - Confirmação de deploy
  - Backup automático
  - Deploy via SSH
  - Health checks
  - Rollback automático em caso de falha

#### Rollback
- **Arquivo**: [scripts/deploy/rollback.sh](scripts/deploy/rollback.sh)
- **Funcionalidade**:
  - Lista backups disponíveis
  - Restauração de configuração anterior
  - Health check pós-rollback
  - Backup do estado atual antes de rollback

#### Configurações de Ambiente
- **Arquivos**:
  - [.env.staging.example](scripts/deploy/.env.staging.example)
  - [.env.production.example](scripts/deploy/.env.production.example)
- **Variáveis**:
  - Server configuration
  - Database credentials
  - Redis configuration
  - JWT secrets
  - AWS credentials
  - WhatsApp/Meta API keys
  - OpenAI/Replicate tokens
  - Monitoring URLs

### 8. ✅ Documentação

#### Deployment Guide
- **Arquivo**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Conteúdo**:
  - Prerequisites
  - Local deployment (3 options)
  - Docker deployment
  - Production deployment
  - CI/CD pipeline
  - Monitoring setup
  - Rollback procedures
  - Troubleshooting

#### Monitoring Guide
- **Arquivo**: [MONITORING.md](MONITORING.md)
- **Conteúdo**:
  - Architecture overview
  - Metrics collection
  - Dashboards guide
  - Alerting setup
  - Distributed tracing
  - Log management
  - Performance monitoring
  - Best practices
  - Useful PromQL queries

---

## 🚀 Como Usar

### Deploy Local

```bash
# Opção 1: Script automático
cd belezza-api
./scripts/deploy/deploy-local.sh

# Opção 2: Docker Compose
docker-compose up -d

# Opção 3: Com monitoramento
docker-compose --profile monitoring up -d
```

**Acessar**:
- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- Actuator: http://localhost:8080/actuator
- Prometheus: http://localhost:9090 (com profile monitoring)
- Grafana: http://localhost:3000 (com profile monitoring)
- Zipkin: http://localhost:9411 (com profile monitoring)

### Deploy Staging/Production

```bash
# 1. Configurar ambiente
cd scripts/deploy
cp .env.production.example .env.production
# Editar .env.production com valores reais

# 2. Deploy para staging
./deploy-production.sh staging

# 3. Verificar staging

# 4. Deploy para production
./deploy-production.sh production
```

### CI/CD Automático

1. **Push para main**:
   - CI executa automaticamente
   - Build, tests, security scan
   - Build da imagem Docker

2. **Aprovação manual**:
   - Deploy staging (automático)
   - Deploy production (requer aprovação)

3. **Monitorar**:
   - GitHub Actions logs
   - Slack notifications
   - Grafana dashboards

---

## 📊 Métricas Disponíveis

### System Metrics
- CPU usage (system, process)
- Memory usage (heap, non-heap)
- Thread count
- GC pause time
- Uptime

### HTTP Metrics
- Request rate (por endpoint, status)
- Response time (avg, percentiles)
- Error rate
- Success rate

### Database Metrics
- Active connections
- Idle connections
- Connection acquire time
- Connection usage time

### Business Metrics
- Appointments created
- Appointments completed
- Appointments cancelled
- Posts published
- WhatsApp messages sent

### Custom Metrics
Adicionar custom metrics:

```java
@Component
public class MyMetrics {
    private final Counter appointmentsCounter;

    public MyMetrics(MeterRegistry registry) {
        this.appointmentsCounter = Counter.builder("appointments.created")
            .description("Total appointments created")
            .tag("type", "booking")
            .register(registry);
    }

    public void recordAppointment() {
        appointmentsCounter.increment();
    }
}
```

---

## 🔔 Alertas Configurados

### Critical (Notificação Imediata)
- ✅ API Down (1 min)
- ✅ Database Connection Pool Exhausted (2 min)

### Warning (Investigar)
- ✅ High Error Rate > 5% (5 min)
- ✅ High Response Time > 2s (5 min)
- ✅ High CPU Usage > 80% (5 min)
- ✅ High Memory Usage > 85% (5 min)
- ✅ High Database Error Rate (5 min)

### Business (Monitorar)
- ✅ High Cancellation Rate > 20% (30 min)
- ✅ Low Appointment Creation Rate (30 min)

---

## 🔧 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Kubernetes Deployment**
   - Criar Helm charts
   - Horizontal Pod Autoscaling
   - Ingress configuration

2. **Advanced Monitoring**
   - APM integration (New Relic, Datadog)
   - Error tracking (Sentry)
   - Real User Monitoring (RUM)

3. **Log Aggregation**
   - ELK Stack
   - Loki + Grafana
   - CloudWatch Logs

4. **Chaos Engineering**
   - Chaos Monkey
   - Resilience testing
   - Failure injection

5. **Performance Testing**
   - Load testing automation
   - Stress testing
   - Endurance testing

---

## 📚 Documentação de Referência

- [DEPLOYMENT.md](DEPLOYMENT.md) - Guia completo de deployment
- [MONITORING.md](MONITORING.md) - Guia completo de monitoramento
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Guia de testes
- [CODE_COVERAGE.md](CODE_COVERAGE.md) - Guia de cobertura de código
- [SECURITY_TESTING.md](SECURITY_TESTING.md) - Guia de testes de segurança
- [LOAD_TESTING.md](LOAD_TESTING.md) - Guia de testes de carga

---

## ✅ Checklist de Implementação

### Monitoramento
- [x] Spring Boot Actuator configurado
- [x] Micrometer + Prometheus integrado
- [x] Métricas customizadas criadas
- [x] Health checks implementados
- [x] Distributed tracing (Zipkin)

### Containerização
- [x] Dockerfile otimizado
- [x] .dockerignore criado
- [x] Multi-stage build
- [x] Non-root user
- [x] Health check no container

### Orquestração
- [x] Docker Compose completo
- [x] Todos os serviços configurados
- [x] Volumes persistentes
- [x] Health checks
- [x] Profiles (monitoring, tools)

### Prometheus
- [x] Configuração de scraping
- [x] Alertas configurados
- [x] Métricas da aplicação
- [x] Métricas de sistema
- [x] Métricas de negócio

### Grafana
- [x] Datasource provisionado
- [x] Dashboard de aplicação
- [x] Dashboard de negócio
- [x] Auto-refresh configurado
- [x] Timezone configurado

### CI/CD
- [x] GitHub Actions CI
- [x] GitHub Actions CD
- [x] Build automático
- [x] Testes automáticos
- [x] Security scan
- [x] Docker image build
- [x] Deploy staging
- [x] Deploy production
- [x] Notificações Slack

### Scripts
- [x] deploy-local.sh
- [x] deploy-production.sh
- [x] rollback.sh
- [x] .env.staging.example
- [x] .env.production.example

### Documentação
- [x] DEPLOYMENT.md
- [x] MONITORING.md
- [x] ETAPA_10_SUMMARY.md
- [x] Instruções de uso
- [x] Troubleshooting guide

---

## 🎉 Conclusão

A **ETAPA 10 - DEPLOY E MONITORAMENTO** foi implementada com sucesso!

O sistema agora possui:
- ✅ Infraestrutura completa de deploy
- ✅ Monitoramento e observabilidade avançados
- ✅ CI/CD automatizado
- ✅ Documentação abrangente
- ✅ Scripts de automação
- ✅ Dashboards de métricas
- ✅ Sistema de alertas
- ✅ Procedimentos de rollback

**Pronto para produção!** 🚀

---

## 📞 Suporte

Para questões ou problemas:
- Consulte a documentação em [DEPLOYMENT.md](DEPLOYMENT.md) e [MONITORING.md](MONITORING.md)
- Verifique os logs: `docker-compose logs -f api`
- Acesse os dashboards do Grafana
- Revise os alertas do Prometheus

---

**Data de Implementação**: 2024-02-08
**Versão**: 1.0.0
**Status**: ✅ Completo
