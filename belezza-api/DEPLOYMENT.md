# Belezza API - Deployment Guide

This guide covers the deployment process for the Belezza API, including local development, staging, and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring](#monitoring)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Java 21+** (Eclipse Temurin recommended)
- **Docker** and **Docker Compose** (for containerized deployment)
- **Maven** (or use the included Maven wrapper `./mvnw`)
- **Git** (for version control)
- **PostgreSQL 16+** (for local development without Docker)
- **Redis 7+** (for caching)

### Optional Software

- **kubectl** (for Kubernetes deployment)
- **helm** (for Kubernetes package management)
- **AWS CLI** (for AWS deployments)

### Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## Local Deployment

### Option 1: Direct Java Execution

1. **Start PostgreSQL and Redis**:
   ```bash
   # Using Docker
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

2. **Configure application**:
   ```bash
   # Edit src/main/resources/application-dev.yml
   # Or set environment variables
   export DATABASE_URL=jdbc:postgresql://localhost:5432/belezza_dev
   export DATABASE_USERNAME=postgres
   export DATABASE_PASSWORD=postgres
   export REDIS_HOST=localhost
   ```

3. **Build and run**:
   ```bash
   ./mvnw clean package -DskipTests
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```

4. **Access the application**:
   - API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger-ui.html
   - Actuator Health: http://localhost:8080/actuator/health

### Option 2: Docker Compose (Recommended)

1. **Start all services**:
   ```bash
   ./scripts/deploy/deploy-local.sh
   ```

   Or manually:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f api
   ```

3. **Stop services**:
   ```bash
   docker-compose down
   ```

### Option 3: Docker Compose with Monitoring

Start the application with full monitoring stack (Prometheus, Grafana, Zipkin):

```bash
docker-compose --profile monitoring up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Zipkin: http://localhost:9411

---

## Docker Deployment

### Building Docker Image

```bash
# Build the image
docker build -t belezza-api:latest ./belezza-api

# Or using docker-compose
docker-compose build api
```

### Running Docker Container

```bash
docker run -d \
  --name belezza-api \
  -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/belezza \
  -e DATABASE_USERNAME=belezza \
  -e DATABASE_PASSWORD=secret \
  -e REDIS_HOST=host.docker.internal \
  belezza-api:latest
```

### Multi-Architecture Builds

```bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-username/belezza-api:latest \
  --push \
  ./belezza-api
```

---

## Production Deployment

### Prerequisites

1. **Server Requirements**:
   - Ubuntu 22.04 LTS or similar
   - Docker and Docker Compose installed
   - SSH access configured
   - SSL/TLS certificates configured (Let's Encrypt recommended)

2. **Configure environment**:
   ```bash
   cd scripts/deploy
   cp .env.production.example .env.production
   # Edit .env.production with production values
   ```

### Deployment Steps

1. **Deploy to staging** (recommended first):
   ```bash
   ./scripts/deploy/deploy-production.sh staging
   ```

2. **Verify staging deployment**:
   - Check health: https://staging-api.belezza.ai/actuator/health
   - Run smoke tests
   - Check metrics in Grafana

3. **Deploy to production**:
   ```bash
   ./scripts/deploy/deploy-production.sh production
   ```

4. **Verify production deployment**:
   - Check health: https://api.belezza.ai/actuator/health
   - Monitor error rates
   - Check user-facing features

### Manual Production Deployment

If you prefer manual deployment:

```bash
# SSH to production server
ssh deploy@api.belezza.ai

# Navigate to deployment directory
cd /opt/belezza

# Pull latest image
docker pull your-username/belezza-api:production

# Update and restart
docker-compose pull api
docker-compose up -d api

# Check logs
docker-compose logs -f api

# Verify health
curl https://api.belezza.ai/actuator/health
```

---

## CI/CD Pipeline

The project uses GitHub Actions for automated CI/CD. Workflows are located in `.github/workflows/`.

### CI Workflow (`api-ci.yml`)

Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Steps:
1. Build and compile
2. Run unit tests
3. Run integration tests
4. Generate code coverage report
5. Run security scans (OWASP Dependency Check)
6. Build Docker image (on push to main)

### CD Workflow (`api-cd.yml`)

Triggered on:
- Push to `main` branch
- Manual workflow dispatch

Steps:
1. Deploy to staging environment
2. Run health checks on staging
3. Wait for approval (production environment protection)
4. Deploy to production
5. Run health checks on production
6. Create GitHub release
7. Send Slack notifications

### Required Secrets

Configure these in GitHub repository settings:

```
# Docker Hub
DOCKER_USERNAME
DOCKER_PASSWORD

# Staging Server
STAGING_SERVER_HOST
STAGING_SERVER_USER
STAGING_SERVER_SSH_KEY
STAGING_SERVER_PORT

# Production Server
PRODUCTION_SERVER_HOST
PRODUCTION_SERVER_USER
PRODUCTION_SERVER_SSH_KEY
PRODUCTION_SERVER_PORT

# Notifications
SLACK_WEBHOOK_URL

# Code Quality
SONAR_TOKEN

# Coverage
CODECOV_TOKEN
```

---

## Monitoring

### Health Checks

The application provides multiple health endpoints:

```bash
# Overall health
curl https://api.belezza.ai/actuator/health

# Liveness probe (Kubernetes)
curl https://api.belezza.ai/actuator/health/liveness

# Readiness probe (Kubernetes)
curl https://api.belezza.ai/actuator/health/readiness

# Detailed health (authenticated)
curl -H "Authorization: Bearer $TOKEN" https://api.belezza.ai/actuator/health
```

### Metrics

#### Prometheus Metrics

Access Prometheus metrics at:
```
https://api.belezza.ai/actuator/prometheus
```

Key metrics:
- `http_server_requests_seconds_*`: HTTP request metrics
- `jvm_memory_*`: JVM memory usage
- `system_cpu_usage`: CPU usage
- `hikaricp_connections_*`: Database connection pool
- `appointments_created_total`: Business metric
- `posts_published_total`: Business metric

#### Grafana Dashboards

Access Grafana at http://localhost:3000 (or your Grafana URL)

Default dashboards:
1. **Application Overview**: System metrics, response times, request rates
2. **Business Metrics**: Appointments, posts, cancellation rates

### Log Aggregation

Logs are available via Docker:

```bash
# View application logs
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 api

# View logs since 1 hour ago
docker-compose logs --since=1h api
```

For production, consider using:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki + Grafana**
- **CloudWatch Logs** (AWS)

### Distributed Tracing

Zipkin is configured for distributed tracing:

- Access: http://localhost:9411
- Sampling rate: 100% (configurable in application.yml)
- Integration: Automatic with Micrometer Tracing

### Alerts

Prometheus alerts are configured in `docker/prometheus/alerts.yml`:

- API Down
- High Error Rate (>5%)
- High Response Time (>2s)
- High CPU Usage (>80%)
- High Memory Usage (>85%)
- Database Connection Pool Exhausted
- High Cancellation Rate (>20%)

Configure Alertmanager for notifications:

```yaml
# alertmanager.yml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK'

route:
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: 'Belezza API Alert'
```

---

## Rollback Procedures

### Automatic Rollback

The deployment script automatically creates backups. To rollback:

```bash
# List available backups
./scripts/deploy/rollback.sh production

# Rollback to specific backup
./scripts/deploy/rollback.sh production belezza-api-backup-20240215-143022
```

### Manual Rollback

1. **Using Docker tags**:
   ```bash
   # On production server
   ssh deploy@api.belezza.ai
   cd /opt/belezza

   # Update docker-compose.yml to use previous tag
   # image: your-username/belezza-api:production-abc123 (previous commit)

   docker-compose pull api
   docker-compose up -d api
   ```

2. **Using Git**:
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push origin main
   # CI/CD will automatically deploy the reverted version
   ```

### Database Rollback

If database migrations need to be rolled back:

```bash
# SSH to server
ssh deploy@api.belezza.ai

# Access database container
docker-compose exec db psql -U belezza -d belezza_production

# Run Flyway repair/undo if available
# Or manually revert migrations
```

---

## Troubleshooting

### Common Issues

#### Application won't start

1. **Check logs**:
   ```bash
   docker-compose logs api
   ```

2. **Check database connectivity**:
   ```bash
   docker-compose exec api curl postgres:5432
   ```

3. **Verify environment variables**:
   ```bash
   docker-compose exec api env | grep DATABASE
   ```

#### High memory usage

1. **Check heap usage**:
   ```bash
   curl https://api.belezza.ai/actuator/metrics/jvm.memory.used
   ```

2. **Adjust JVM settings** in Dockerfile:
   ```dockerfile
   ENV JAVA_OPTS="-Xms512m -Xmx1024m"
   ```

3. **Generate heap dump**:
   ```bash
   docker-compose exec api jmap -dump:format=b,file=/tmp/heap.bin 1
   ```

#### Database connection pool exhausted

1. **Check active connections**:
   ```bash
   curl https://api.belezza.ai/actuator/metrics/hikaricp.connections.active
   ```

2. **Increase pool size** in application.yml:
   ```yaml
   spring:
     datasource:
       hikari:
         maximum-pool-size: 20
   ```

#### Slow response times

1. **Check database queries**:
   - Enable SQL logging: `spring.jpa.show-sql=true`
   - Use `EXPLAIN ANALYZE` for slow queries

2. **Check Redis connectivity**:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

3. **Review Grafana dashboards** for bottlenecks

### Debug Mode

To enable debug logging:

```bash
# Set environment variable
export LOGGING_LEVEL_COM_BELEZZA=DEBUG

# Or in application.yml
logging:
  level:
    com.belezza: DEBUG
```

### Performance Profiling

Use JProfiler or VisualVM:

```bash
# Enable JMX
JAVA_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9010 \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false"
```

---

## Additional Resources

- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

## Support

For deployment issues or questions:
- Open an issue on GitHub
- Contact DevOps team at devops@belezza.ai
- Check internal documentation wiki
