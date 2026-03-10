# Belezza API - Deployment Guide

## Overview

This guide covers deploying the Belezza API to various environments.

---

## 1. Prerequisites

### 1.1 Required Tools
- Docker 24.0+
- Docker Compose 2.0+
- Git
- AWS CLI (for S3 backups)
- PostgreSQL client (for database management)

### 1.2 Accounts & Services
- GitHub account (for CI/CD)
- Container registry access (ghcr.io or DockerHub)
- AWS account (for S3 storage)
- Meta Developer account (for WhatsApp/Instagram)
- OpenAI account (for AI features)

---

## 2. Local Development

```bash
# Clone repository
git clone https://github.com/your-org/belezza-api.git
cd belezza-api

# Copy environment file
cp .env.example .env

# Edit .env with your values
vim .env

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Access API
curl http://localhost:8080/actuator/health
```

---

## 3. Staging Deployment

### 3.1 Manual Deployment

```bash
# SSH to staging server
ssh deploy@staging.belezza.ai

# Navigate to deployment directory
cd /opt/belezza

# Pull latest changes
git pull origin develop

# Update environment
cp belezza-api/scripts/deploy/.env.staging.example .env
vim .env  # Fill in staging values

# Deploy
cd belezza-api
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d

# Verify deployment
curl https://staging-api.belezza.ai/actuator/health
```

### 3.2 CI/CD Deployment (GitHub Actions)

Staging is automatically deployed when pushing to the `develop` branch.

1. Push to develop:
   ```bash
   git push origin develop
   ```

2. Monitor deployment in GitHub Actions

3. Verify at https://staging-api.belezza.ai

---

## 4. Production Deployment

### 4.1 Pre-Deployment Checklist

- [ ] All tests passing on staging
- [ ] Database migration reviewed
- [ ] Environment variables verified
- [ ] Backup created
- [ ] Team notified of deployment window
- [ ] Rollback plan ready

### 4.2 Manual Deployment

```bash
# SSH to production server
ssh deploy@api.belezza.ai

# Create backup before deployment
./scripts/backup-database.sh -e production -s belezza-backups

# Pull latest release
cd /opt/belezza
git fetch --tags
git checkout v1.0.0  # Replace with actual version

# Update environment
vim .env  # Verify production values

# Deploy with zero downtime
cd belezza-api
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps api

# Verify deployment
curl https://api.belezza.ai/actuator/health

# Monitor logs for errors
docker logs -f belezza-api-prod
```

### 4.3 CI/CD Deployment

Production is automatically deployed when pushing to the `main` branch.

1. Create PR from develop to main
2. Get approval
3. Merge PR
4. GitHub Actions will:
   - Run tests
   - Security scan
   - Build Docker image
   - Deploy to production

---

## 5. Environment Configuration

### 5.1 Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `jdbc:postgresql://db:5432/belezza` |
| `DATABASE_PASSWORD` | DB password | `secure_password` |
| `JWT_SECRET` | JWT signing key (256+ bits) | `generated_secret` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | `secret...` |
| `AWS_S3_BUCKET` | S3 bucket name | `belezza-images` |

### 5.2 Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ALLOWED_ORIGINS` | Allowed origins | `http://localhost:3000` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `dev` |
| `WHATSAPP_*` | WhatsApp config | (none) |
| `META_*` | Meta API config | (none) |
| `OPENAI_API_KEY` | OpenAI key | (none) |

---

## 6. Cloud Providers

### 6.1 AWS Deployment

```bash
# Using ECS
aws ecs create-service \
  --cluster belezza-cluster \
  --service-name belezza-api \
  --task-definition belezza-api:latest \
  --desired-count 2

# Using Elastic Beanstalk
eb init belezza-api
eb create production
eb deploy
```

### 6.2 Railway Deployment

```bash
# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

### 6.3 Render Deployment

1. Connect GitHub repository
2. Select `belezza-api/Dockerfile`
3. Set environment variables
4. Deploy

### 6.4 DigitalOcean App Platform

```bash
# Using doctl
doctl apps create --spec app-spec.yaml
doctl apps create-deployment <app-id>
```

---

## 7. Monitoring Setup

### 7.1 Start Monitoring Stack

```bash
# Start with monitoring profile
docker-compose --profile monitoring up -d

# Access Prometheus
open http://localhost:9090

# Access Grafana (admin/admin)
open http://localhost:3000
```

### 7.2 Import Grafana Dashboards

1. Login to Grafana
2. Go to Dashboards > Import
3. Upload dashboard JSON from `docker/grafana/dashboards/`

### 7.3 Configure Alerts

1. Edit `docker/alertmanager/alertmanager.yml`
2. Add Slack webhook URL
3. Restart alertmanager

---

## 8. Database Management

### 8.1 Run Migrations

```bash
# Migrations run automatically on startup
# To run manually:
docker exec belezza-api-prod java -jar app.jar --spring.flyway.repair=true
```

### 8.2 Backup Database

```bash
# Manual backup
./scripts/backup-database.sh -e production -s belezza-backups

# Scheduled backup (add to crontab)
0 2 * * * /opt/belezza/scripts/backup-database.sh -e production -r 30 -s belezza-backups
```

### 8.3 Restore Database

```bash
# From local file
./scripts/restore-database.sh -e staging backup.sql.gz

# From S3
./scripts/restore-database.sh -e staging -s belezza-backups backup.sql.gz
```

---

## 9. SSL/TLS Configuration

### 9.1 Let's Encrypt (Production)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Generate certificate
certbot --nginx -d api.belezza.ai

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet
```

### 9.2 Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/server.key \
  -out docker/nginx/ssl/server.crt
```

---

## 10. Scaling

### 10.1 Horizontal Scaling

```bash
# Scale API to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

### 10.2 Database Connection Pool

Edit `application-prod.yml`:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 30
      minimum-idle: 10
```

### 10.3 Redis Cluster

For high availability, consider Redis Cluster or Redis Sentinel.

---

## 11. Troubleshooting

### 11.1 Container Won't Start

```bash
# Check logs
docker logs belezza-api-prod --tail 100

# Check resources
docker stats --no-stream

# Check health
docker inspect belezza-api-prod | jq '.[0].State.Health'
```

### 11.2 Database Connection Issues

```bash
# Test connection
docker exec belezza-api-prod nc -zv db 5432

# Check DB status
docker exec belezza-db-prod pg_isready
```

### 11.3 Memory Issues

```bash
# Increase heap size
# In docker-compose, add:
environment:
  JAVA_OPTS: "-Xms512m -Xmx1g"
```

---

## 12. Rollback

### 12.1 Quick Rollback

```bash
# Rollback to previous image
docker-compose -f docker-compose.prod.yml down
docker tag ghcr.io/belezza-api:previous ghcr.io/belezza-api:latest
docker-compose -f docker-compose.prod.yml up -d
```

### 12.2 Database Rollback

```bash
# Restore from backup
./scripts/restore-database.sh -e production backup_before_deploy.sql.gz
```

---

## 13. Security Considerations

1. **Never commit secrets** - Use environment variables
2. **Use secrets manager** - AWS Secrets Manager or Vault
3. **Rotate credentials** - JWT secret, API keys regularly
4. **Keep dependencies updated** - Run OWASP check regularly
5. **Enable rate limiting** - Protect against DDoS
6. **Use HTTPS everywhere** - SSL/TLS required
7. **Restrict network access** - Use VPC, security groups
