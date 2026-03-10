# Belezza API - Disaster Recovery Plan

## Document Information

| Item | Details |
|------|---------|
| Version | 1.0 |
| Last Updated | February 2026 |
| Owner | DevOps Team |
| Review Frequency | Monthly |

---

## 1. Overview

This document outlines the disaster recovery (DR) procedures for the Belezza API. It covers backup strategies, recovery procedures, and business continuity plans.

### 1.1 Recovery Objectives

| Metric | Target | Priority |
|--------|--------|----------|
| **RTO** (Recovery Time Objective) | 4 hours | Critical systems |
| **RPO** (Recovery Point Objective) | 1 hour | Database |
| **MTTR** (Mean Time To Recovery) | 2 hours | Standard incidents |

### 1.2 Critical Components

| Component | Priority | Backup Frequency |
|-----------|----------|------------------|
| PostgreSQL Database | Critical | Daily (2 AM UTC) |
| Redis Cache | High | N/A (ephemeral) |
| S3 Images | Medium | Cross-region replication |
| Configuration Files | Medium | Git versioned |
| SSL Certificates | Medium | Stored in secrets manager |

---

## 2. Backup Strategy

### 2.1 Database Backups

#### Automatic Daily Backups
```bash
# Cron job runs daily at 2 AM UTC
0 2 * * * /opt/belezza/scripts/backup-database.sh -e production -r 30 -s belezza-backups
```

#### Backup Locations
| Type | Location | Retention |
|------|----------|-----------|
| Local | `/var/backups/belezza/` | 7 days |
| S3 | `s3://belezza-backups/database-backups/production/` | 30 days |
| Cross-Region | `s3://belezza-backups-dr/database-backups/` | 90 days |

#### Backup Verification
- Automated integrity check after each backup
- Monthly restore test to staging environment
- Checksum verification on download

### 2.2 Image Storage (S3)

```
AWS S3 Configuration:
- Primary Bucket: belezza-images (sa-east-1)
- Replication: Cross-region to us-east-1
- Versioning: Enabled
- Lifecycle:
  - Standard -> Standard-IA: 30 days
  - Standard-IA -> Glacier: 90 days
  - Glacier deletion: 365 days
```

### 2.3 Configuration & Code

| Item | Backup Method |
|------|---------------|
| Application Code | Git (GitHub) |
| Docker Images | GitHub Container Registry |
| Environment Variables | AWS Secrets Manager |
| SSL Certificates | AWS Certificate Manager |

---

## 3. Recovery Procedures

### 3.1 Database Recovery

#### Scenario: Database Corruption or Data Loss

**Step 1: Assess the situation**
```bash
# Check database status
docker exec belezza-db-prod pg_isready -U belezza

# Check recent logs
docker logs belezza-db-prod --tail 100
```

**Step 2: Stop the application**
```bash
docker-compose -f docker-compose.prod.yml stop api
```

**Step 3: Download latest backup**
```bash
# List available backups
aws s3 ls s3://belezza-backups/database-backups/production/ --recursive

# Download specific backup
aws s3 cp s3://belezza-backups/database-backups/production/belezza_production_YYYYMMDD_HHMMSS.sql.gz /var/backups/
```

**Step 4: Restore database**
```bash
cd /opt/belezza
./scripts/restore-database.sh -e production /var/backups/belezza_production_YYYYMMDD_HHMMSS.sql.gz
```

**Step 5: Restart application**
```bash
docker-compose -f docker-compose.prod.yml up -d api
```

**Step 6: Verify recovery**
```bash
# Health check
curl https://api.belezza.ai/actuator/health

# Basic functionality test
curl -X POST https://api.belezza.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### 3.2 Application Recovery

#### Scenario: Application Container Failure

**Step 1: Check container status**
```bash
docker ps -a | grep belezza-api
docker logs belezza-api-prod --tail 200
```

**Step 2: Restart container**
```bash
docker-compose -f docker-compose.prod.yml restart api
```

**Step 3: If restart fails, redeploy**
```bash
# Pull latest image
docker pull ghcr.io/belezza-api:latest

# Recreate container
docker-compose -f docker-compose.prod.yml up -d --force-recreate api
```

### 3.3 Full System Recovery

#### Scenario: Complete Server Failure

**Prerequisites:**
- New server provisioned with Docker
- Network configured with same IP/DNS
- SSL certificates available

**Step 1: Clone repository**
```bash
git clone https://github.com/your-org/belezza-api.git /opt/belezza
cd /opt/belezza
```

**Step 2: Configure environment**
```bash
# Copy production environment
cp belezza-api/.env.production.example belezza-api/.env

# Fill in secrets from AWS Secrets Manager
# Edit .env with production values
```

**Step 3: Pull Docker images**
```bash
docker login ghcr.io
docker pull ghcr.io/belezza-api:latest
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull nginx:alpine
```

**Step 4: Restore database**
```bash
# Start only database
docker-compose -f docker-compose.prod.yml up -d db

# Wait for database to be ready
sleep 30

# Restore from backup
./scripts/restore-database.sh -e production -s belezza-backups latest
```

**Step 5: Start all services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Step 6: Verify system**
```bash
# Check all containers
docker ps

# Health check
curl http://localhost:8080/actuator/health

# Check Prometheus
curl http://localhost:9090/-/healthy
```

### 3.4 DNS Failover

If using a cloud provider with DNS failover:

```
Primary: api.belezza.ai -> 1.2.3.4 (sa-east-1)
Secondary: api.belezza.ai -> 5.6.7.8 (us-east-1)
Health Check: https://api.belezza.ai/actuator/health/liveness
Failover TTL: 60 seconds
```

---

## 4. Incident Response

### 4.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | Complete outage | 15 minutes | Database down, API unreachable |
| SEV-2 | Partial outage | 30 minutes | High error rate, degraded performance |
| SEV-3 | Minor issue | 4 hours | Single feature broken |
| SEV-4 | Low impact | 24 hours | Cosmetic issues, minor bugs |

### 4.2 Communication Plan

**Internal Notification:**
1. Slack #belezza-alerts (automated)
2. On-call engineer (PagerDuty)
3. Engineering lead (if SEV-1/SEV-2)
4. CTO (if SEV-1)

**External Communication (if customer-facing):**
1. Status page update (statuspage.io)
2. Twitter/Social media update
3. Email to affected customers (if > 1 hour outage)

### 4.3 Incident Template

```markdown
# Incident Report: [Brief Description]

## Summary
- **Date/Time:** YYYY-MM-DD HH:MM UTC
- **Duration:** X hours Y minutes
- **Severity:** SEV-X
- **Impact:** [Description of customer impact]

## Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

## Root Cause
[Description of what caused the incident]

## Resolution
[Description of how it was fixed]

## Action Items
- [ ] Item 1
- [ ] Item 2

## Lessons Learned
[What we learned and how to prevent recurrence]
```

---

## 5. Testing Plan

### 5.1 Monthly Tests

| Test | Frequency | Owner |
|------|-----------|-------|
| Backup restore to staging | Monthly | DevOps |
| Failover simulation | Quarterly | DevOps |
| Full DR exercise | Annually | All teams |

### 5.2 Backup Restore Test Procedure

```bash
# 1. Schedule maintenance window
# 2. Download latest production backup
aws s3 cp s3://belezza-backups/database-backups/production/latest.sql.gz /tmp/

# 3. Restore to staging database
./scripts/restore-database.sh -e staging /tmp/latest.sql.gz

# 4. Verify data integrity
psql -h staging-db -U belezza -d belezza_staging \
  -c "SELECT COUNT(*) FROM usuarios;"

# 5. Run smoke tests
./scripts/smoke-tests.sh staging

# 6. Document results
echo "Backup restore test completed: $(date)" >> /var/log/dr-tests.log
```

---

## 6. Contact Information

### 6.1 On-Call Rotation

| Role | Primary | Secondary |
|------|---------|-----------|
| DevOps | [Name] | [Name] |
| Backend | [Name] | [Name] |
| Database | [Name] | [Name] |

### 6.2 External Contacts

| Service | Contact | SLA |
|---------|---------|-----|
| AWS Support | Business/Enterprise | 1 hour |
| GitHub | Premium Support | 4 hours |
| Meta (WhatsApp) | Developer Support | 24 hours |

---

## 7. Runbooks

### 7.1 Common Issues

#### High CPU Usage
```bash
# 1. Check which process is using CPU
docker stats --no-stream

# 2. Check application metrics
curl http://localhost:8080/actuator/metrics/system.cpu.usage

# 3. If needed, scale horizontally
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

#### High Memory Usage
```bash
# 1. Check JVM memory
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# 2. Force garbage collection (if enabled)
curl -X POST http://localhost:8080/actuator/gc

# 3. Check for memory leaks
curl http://localhost:8080/actuator/heapdump > heap.hprof
```

#### Database Connection Pool Exhaustion
```bash
# 1. Check active connections
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active

# 2. Check for long-running queries
docker exec belezza-db-prod psql -U belezza -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 3. Kill long-running queries if needed
docker exec belezza-db-prod psql -U belezza -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '10 minutes';"
```

---

## 8. Appendix

### 8.1 Useful Commands

```bash
# View all containers
docker ps -a

# View container logs
docker logs -f belezza-api-prod

# Enter container shell
docker exec -it belezza-api-prod sh

# Database shell
docker exec -it belezza-db-prod psql -U belezza -d belezza

# Clear Redis cache
docker exec belezza-redis-prod redis-cli FLUSHALL

# Restart all services
docker-compose -f docker-compose.prod.yml restart
```

### 8.2 Important File Locations

| File | Location |
|------|----------|
| Application logs | `/var/log/belezza/` |
| Docker compose files | `/opt/belezza/belezza-api/` |
| Backup scripts | `/opt/belezza/belezza-api/scripts/` |
| SSL certificates | `/etc/nginx/ssl/` |
| Environment files | `/opt/belezza/.env` |

---

*Document approved by: [Name, Title]*
*Next review date: [Date]*
