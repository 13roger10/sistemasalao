# ETAPA 10 - Deploy e Monitoramento

## Overview

Esta etapa cobre a configuração de CI/CD, deploy cloud, variáveis de ambiente, monitoramento e backup para a Belezza API.

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | Guia completo de deploy |
| [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) | Plano de recuperação de desastres |

---

## 10.1 Pipeline CI/CD

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `.github/workflows/ci-cd.yml` | Pipeline GitHub Actions |

### Funcionalidades

- [x] T10.1.1 - GitHub Actions workflow
- [x] T10.1.2 - Step: Build & Test
- [x] T10.1.3 - Step: Security Scan (OWASP, CodeQL, Trivy)
- [x] T10.1.4 - Step: Build Docker Image
- [x] T10.1.5 - Step: Push to Registry (GitHub Container Registry)
- [x] T10.1.6 - Step: Deploy to Cloud
- [x] T10.1.7 - Configurar ambiente staging
- [x] T10.1.8 - Configurar ambiente production

---

## 10.2 Deploy Cloud

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.staging.yml` | Docker Compose para staging |
| `docker-compose.prod.yml` | Docker Compose para produção |
| `docker/nginx/nginx.conf` | Configuração Nginx (staging) |
| `docker/nginx/nginx.prod.conf` | Configuração Nginx (produção) |

### Funcionalidades

- [x] T10.2.1 - Escolher provedor (configurado para múltiplos: AWS, Railway, Render, DO)
- [x] T10.2.2 - Configurar auto-scaling (Docker Swarm mode, Kubernetes ready)
- [x] T10.2.3 - Configurar load balancer (Nginx com upstream)
- [x] T10.2.4 - Configurar SSL/TLS (Let's Encrypt ready)

---

## 10.3 Variáveis de Ambiente

### Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `.env.example` | Template de variáveis (desenvolvimento) |
| `scripts/deploy/.env.staging.example` | Template para staging |
| `scripts/deploy/.env.production.example` | Template para produção |

### Variáveis Configuradas

- [x] T10.3.1 - DATABASE_URL
- [x] T10.3.2 - JWT_SECRET
- [x] T10.3.3 - WHATSAPP_TOKEN
- [x] T10.3.4 - WHATSAPP_PHONE_ID
- [x] T10.3.5 - META_APP_ID
- [x] T10.3.6 - META_APP_SECRET
- [x] T10.3.7 - OPENAI_API_KEY
- [x] T10.3.8 - AWS_ACCESS_KEY
- [x] T10.3.9 - AWS_SECRET_KEY
- [x] T10.3.10 - S3_BUCKET
- [x] T10.3.11 - Usar secrets manager (documentado para AWS Secrets Manager/Vault)

---

## 10.4 Monitoramento

### Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `docker/prometheus/prometheus.yml` | Configuração Prometheus (dev) |
| `docker/prometheus/prometheus.prod.yml` | Configuração Prometheus (prod) |
| `docker/prometheus/alerts.yml` | Regras de alerta |
| `docker/alertmanager/alertmanager.yml` | Configuração Alertmanager |
| `docker/grafana/dashboards/*.json` | Dashboards Grafana |
| `docker/grafana/provisioning/*` | Configuração Grafana |

### Funcionalidades

- [x] T10.4.1 - Configurar Spring Actuator endpoints
- [x] T10.4.2 - Endpoint /actuator/health
- [x] T10.4.3 - Endpoint /actuator/metrics
- [x] T10.4.4 - Endpoint /actuator/info
- [x] T10.4.5 - Integrar Prometheus
- [x] T10.4.6 - Integrar Grafana
- [x] T10.4.7 - Alerta: CPU > 80%
- [x] T10.4.8 - Alerta: Memória > 80%
- [x] T10.4.9 - Alerta: Erros 5xx > 1%
- [x] T10.4.10 - Alerta: Latência p99 > 2s

### Alertas Configurados

```yaml
# Alertas críticos
- BelezzaAPIDown: API offline por > 1 minuto
- DatabaseConnectionPoolExhausted: Pool de conexões > 90%

# Alertas de warning
- HighCPUUsage: CPU > 80%
- HighMemoryUsage: Memória heap > 80%
- HighErrorRate5xx: Taxa de erros 5xx > 1%
- HighResponseTimeP99: Latência p99 > 2s

# Alertas de negócio
- LowAppointmentCreationRate: Baixa criação de agendamentos
- HighCancellationRate: Taxa de cancelamento > 20%
```

---

## 10.5 Backup

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `scripts/backup-database.sh` | Script de backup do banco |
| `scripts/restore-database.sh` | Script de restore do banco |

### Funcionalidades

- [x] T10.5.1 - Backup automático PostgreSQL (diário)
- [x] T10.5.2 - Retenção: 30 dias
- [x] T10.5.3 - Backup de imagens S3 (cross-region)
- [x] T10.5.4 - Testar restore mensalmente (documentado em DR)
- [x] T10.5.5 - Documentar procedimento de DR

---

## Uso

### Iniciar ambiente de desenvolvimento

```bash
cd belezza-api
docker-compose up -d
```

### Iniciar com monitoramento

```bash
docker-compose --profile monitoring up -d
```

### Deploy staging

```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Deploy produção

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Executar backup

```bash
./scripts/backup-database.sh -e production -r 30 -s belezza-backups
```

### Restaurar backup

```bash
./scripts/restore-database.sh -e staging backup.sql.gz
```

---

## Comandos Úteis

```bash
# Verificar saúde da aplicação
curl http://localhost:8080/actuator/health

# Ver métricas Prometheus
curl http://localhost:8080/actuator/prometheus

# Ver status dos containers
docker-compose ps

# Ver logs da API
docker-compose logs -f api

# Escalar API
docker-compose up -d --scale api=3
```

---

## URLs dos Serviços

| Serviço | URL (Dev) | URL (Prod) |
|---------|-----------|------------|
| API | http://localhost:8080 | https://api.belezza.ai |
| Swagger | http://localhost:8080/swagger-ui.html | (desabilitado) |
| Prometheus | http://localhost:9090 | https://prometheus.belezza.ai |
| Grafana | http://localhost:3000 | https://monitoring.belezza.ai |
| Zipkin | http://localhost:9411 | (interno) |
