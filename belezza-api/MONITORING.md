# Belezza API - Monitoring Guide

This guide covers the monitoring and observability setup for the Belezza API.

## Table of Contents

1. [Overview](#overview)
2. [Metrics Collection](#metrics-collection)
3. [Dashboards](#dashboards)
4. [Alerting](#alerting)
5. [Distributed Tracing](#distributed-tracing)
6. [Log Management](#log-management)
7. [Performance Monitoring](#performance-monitoring)
8. [Best Practices](#best-practices)

---

## Overview

The Belezza API monitoring stack consists of:

- **Spring Boot Actuator**: Exposes application metrics and health endpoints
- **Micrometer**: Metrics instrumentation library
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **Zipkin**: Distributed tracing
- **Alerts**: Prometheus Alertmanager for notifications

### Architecture

```
┌─────────────┐
│ Belezza API │──┐
└─────────────┘  │
                 │ /actuator/prometheus
                 ▼
            ┌──────────┐
            │Prometheus│──┐
            └──────────┘  │
                          │
                          ▼
                    ┌─────────┐
                    │ Grafana │
                    └─────────┘

┌─────────────┐
│ Belezza API │──┐
└─────────────┘  │
                 │ Traces
                 ▼
            ┌────────┐
            │ Zipkin │
            └────────┘
```

---

## Metrics Collection

### Actuator Endpoints

The following Actuator endpoints are exposed:

```bash
# Health check
GET /actuator/health

# Detailed health (requires authentication)
GET /actuator/health/liveness
GET /actuator/health/readiness

# Prometheus metrics
GET /actuator/prometheus

# All available metrics
GET /actuator/metrics

# Specific metric
GET /actuator/metrics/jvm.memory.used

# Application info
GET /actuator/info

# Environment variables
GET /actuator/env

# Loggers configuration
GET /actuator/loggers
```

### Key Metrics

#### HTTP Metrics

```promql
# Request rate
rate(http_server_requests_seconds_count[5m])

# Average response time
rate(http_server_requests_seconds_sum[5m]) / rate(http_server_requests_seconds_count[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

# Error rate (5xx errors)
rate(http_server_requests_seconds_count{status=~"5.."}[5m])

# Success rate
rate(http_server_requests_seconds_count{status=~"2.."}[5m]) / rate(http_server_requests_seconds_count[5m])
```

#### JVM Metrics

```promql
# Heap memory usage
jvm_memory_used_bytes{area="heap"}

# Heap memory max
jvm_memory_max_bytes{area="heap"}

# Heap usage percentage
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} * 100

# GC pause time
rate(jvm_gc_pause_seconds_sum[5m])

# Thread count
jvm_threads_live
```

#### System Metrics

```promql
# CPU usage
system_cpu_usage
process_cpu_usage

# Uptime
process_uptime_seconds
```

#### Database Metrics

```promql
# Active connections
hikaricp_connections_active

# Idle connections
hikaricp_connections_idle

# Connection wait time
hikaricp_connections_acquire_seconds

# Connection usage
hikaricp_connections_usage_seconds
```

#### Business Metrics

Custom metrics for business KPIs:

```promql
# Appointments created
appointments_created_total

# Appointments completed
appointments_completed_total

# Appointments cancelled
appointments_cancelled_total

# Cancellation rate
rate(appointments_cancelled_total[1h]) / rate(appointments_created_total[1h])

# Posts published
posts_published_total

# WhatsApp messages sent
whatsapp_messages_sent_total
```

---

## Dashboards

### Grafana Setup

1. **Access Grafana**:
   ```
   http://localhost:3000
   Username: admin
   Password: admin (change on first login)
   ```

2. **Datasource is auto-configured** via provisioning:
   - Name: Prometheus
   - URL: http://prometheus:9090
   - Type: Prometheus

3. **Dashboards are auto-loaded** from `docker/grafana/dashboards/`:
   - Application Overview
   - Business Metrics

### Application Overview Dashboard

**Panels**:

1. **Application Status**
   - Shows if the API is UP or DOWN
   - Query: `up{job="belezza-api"}`

2. **HTTP Request Rate**
   - Requests per second by endpoint
   - Query: `rate(http_server_requests_seconds_count{application="belezza-api"}[5m])`

3. **HTTP Response Time**
   - 95th and 99th percentile response times
   - Query: `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))`

4. **CPU Usage**
   - System and process CPU usage
   - Query: `system_cpu_usage{application="belezza-api"} * 100`

5. **JVM Memory Usage**
   - Heap used vs max
   - Query: `jvm_memory_used_bytes{area="heap"}` and `jvm_memory_max_bytes{area="heap"}`

6. **Database Connections**
   - Active and idle connections
   - Query: `hikaricp_connections_active{application="belezza-api"}`

7. **JVM Threads**
   - Live thread count
   - Query: `jvm_threads_live{application="belezza-api"}`

8. **Heap Usage Percentage**
   - Percentage of heap used
   - Query: `(jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) * 100`

### Business Metrics Dashboard

**Panels**:

1. **Appointments Created (24h)**
   - Total appointments created in last 24 hours
   - Query: `increase(appointments_created_total[24h])`

2. **Cancellation Rate**
   - Percentage of cancelled appointments
   - Query: `(increase(appointments_cancelled_total[24h]) / increase(appointments_created_total[24h])) * 100`

3. **Social Posts Published**
   - Total posts published in last 24 hours
   - Query: `increase(posts_published_total[24h])`

4. **WhatsApp Messages**
   - Messages sent in last 24 hours
   - Query: `increase(whatsapp_messages_sent_total[24h])`

5. **Appointment Activity**
   - Time series of created, completed, cancelled
   - Query: `rate(appointments_created_total[5m]) * 300`

6. **Top API Endpoints**
   - Pie chart of most used endpoints
   - Query: `sum(increase(http_server_requests_seconds_count[1h])) by (uri)`

7. **HTTP Status Codes**
   - Bar chart of 2xx, 4xx, 5xx responses
   - Query: `sum(increase(http_server_requests_seconds_count{status=~"2.."}[1h]))`

### Creating Custom Dashboards

1. **In Grafana UI**:
   - Click "+" → "Dashboard"
   - Add Panel
   - Select Prometheus datasource
   - Enter PromQL query
   - Configure visualization

2. **Export and save**:
   - Dashboard Settings → JSON Model
   - Save to `docker/grafana/dashboards/`
   - Commit to version control

---

## Alerting

### Prometheus Alerts

Alerts are configured in `docker/prometheus/alerts.yml`:

#### Critical Alerts

1. **BelezzaAPIDown**
   ```yaml
   - alert: BelezzaAPIDown
     expr: up{job="belezza-api"} == 0
     for: 1m
     labels:
       severity: critical
     annotations:
       summary: "Belezza API is down"
   ```

2. **DatabaseConnectionPoolExhausted**
   ```yaml
   - alert: DatabaseConnectionPoolExhausted
     expr: hikaricp_connections_active / hikaricp_connections_max > 0.90
     for: 2m
     labels:
       severity: critical
   ```

#### Warning Alerts

1. **HighErrorRate**
   ```yaml
   - alert: HighErrorRate
     expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.05
     for: 5m
     labels:
       severity: warning
   ```

2. **HighResponseTime**
   ```yaml
   - alert: HighResponseTime
     expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])) > 2
     for: 5m
     labels:
       severity: warning
   ```

3. **HighCPUUsage**
   ```yaml
   - alert: HighCPUUsage
     expr: system_cpu_usage > 0.80
     for: 5m
     labels:
       severity: warning
   ```

4. **HighMemoryUsage**
   ```yaml
   - alert: HighMemoryUsage
     expr: (jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) > 0.85
     for: 5m
     labels:
       severity: warning
   ```

#### Business Metric Alerts

1. **HighCancellationRate**
   ```yaml
   - alert: HighCancellationRate
     expr: (rate(appointments_cancelled_total[1h]) / rate(appointments_created_total[1h])) > 0.20
     for: 30m
     labels:
       severity: warning
   ```

### Setting Up Alertmanager

1. **Create alertmanager.yml**:
   ```yaml
   global:
     resolve_timeout: 5m
     slack_api_url: 'YOUR_SLACK_WEBHOOK'

   route:
     group_by: ['alertname', 'severity']
     group_wait: 10s
     group_interval: 10s
     repeat_interval: 12h
     receiver: 'slack-notifications'

   receivers:
     - name: 'slack-notifications'
       slack_configs:
         - channel: '#alerts'
           title: '{{ .CommonAnnotations.summary }}'
           text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
           send_resolved: true
   ```

2. **Add to docker-compose.yml**:
   ```yaml
   alertmanager:
     image: prom/alertmanager:latest
     ports:
       - "9093:9093"
     volumes:
       - ./docker/prometheus/alertmanager.yml:/etc/alertmanager/alertmanager.yml
   ```

3. **Configure Prometheus** to use Alertmanager:
   ```yaml
   alerting:
     alertmanagers:
       - static_configs:
           - targets: ['alertmanager:9093']
   ```

---

## Distributed Tracing

### Zipkin Setup

Zipkin is configured for distributed tracing across microservices.

**Access Zipkin UI**: http://localhost:9411

### Key Features

1. **Trace Visualization**:
   - See request flow through the system
   - Identify slow operations
   - Debug errors across services

2. **Service Dependencies**:
   - View service dependency graph
   - Understand system architecture

3. **Search Traces**:
   - By service name
   - By tag (e.g., HTTP method, status)
   - By duration

### Trace Annotations

Spring Boot automatically traces:
- HTTP requests
- Database queries
- Redis operations
- External HTTP calls

Custom traces can be added:

```java
@Service
public class MyService {
    @NewSpan("custom-operation")
    public void doSomething() {
        // This will create a new span in the trace
    }
}
```

### Sampling

Current sampling rate: **100%** (all requests traced)

For production, consider reducing:

```yaml
# application-production.yml
management:
  tracing:
    sampling:
      probability: 0.1  # Sample 10% of requests
```

---

## Log Management

### Log Levels

Configure logging levels in `application.yml`:

```yaml
logging:
  level:
    root: INFO
    com.belezza: DEBUG
    org.springframework: INFO
    org.hibernate: WARN
```

### Accessing Logs

**Docker Compose**:
```bash
# View all logs
docker-compose logs -f

# View API logs only
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api

# Since 1 hour ago
docker-compose logs --since=1h api
```

**Production Server**:
```bash
# SSH to server
ssh deploy@api.belezza.ai

# View logs
docker logs -f belezza-api

# Or via docker-compose
cd /opt/belezza
docker-compose logs -f api
```

### Structured Logging

For production, use JSON logging:

```yaml
# application-production.yml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
  level:
    com.belezza: INFO
```

Consider using **Logback JSON encoder**:

```xml
<!-- logback-spring.xml -->
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
</appender>
```

### Centralized Logging

For production, integrate with:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Loki + Grafana**
3. **CloudWatch Logs** (AWS)
4. **Datadog**

---

## Performance Monitoring

### Application Performance Monitoring (APM)

Consider integrating APM tools:

1. **New Relic**
   ```yaml
   # Add agent to Dockerfile
   RUN wget -O newrelic.jar https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic.jar

   # Update JAVA_OPTS
   ENV JAVA_OPTS="-javaagent:/app/newrelic.jar"
   ```

2. **Datadog**
   ```yaml
   # Add agent
   RUN wget -O dd-java-agent.jar https://dtdg.co/latest-java-tracer

   ENV JAVA_OPTS="-javaagent:/app/dd-java-agent.jar \
     -Ddd.service=belezza-api \
     -Ddd.env=production"
   ```

3. **Elastic APM**
   ```yaml
   # Add dependency
   <dependency>
     <groupId>co.elastic.apm</groupId>
     <artifactId>elastic-apm-agent</artifactId>
   </dependency>
   ```

### Database Query Performance

Monitor slow queries:

```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true
        use_sql_comments: true
```

View query statistics:
```bash
curl http://localhost:8080/actuator/metrics/hibernate.query.execution.total
```

### Cache Performance

Monitor Redis cache hits/misses:

```promql
# Cache hit rate
rate(cache_gets_total{result="hit"}[5m]) / rate(cache_gets_total[5m])
```

---

## Best Practices

### 1. Set Up Alerts

- Configure alerts for critical issues (API down, high error rate)
- Set appropriate thresholds based on baseline metrics
- Avoid alert fatigue - don't alert on everything

### 2. Monitor Business Metrics

- Track KPIs specific to your business (appointments, cancellations)
- Create dashboards for stakeholders
- Set up alerts for unusual business patterns

### 3. Use SLIs and SLOs

Define Service Level Indicators (SLIs):
- Availability: 99.9% uptime
- Latency: 95% of requests < 500ms
- Error Rate: < 1% of requests

Monitor against Service Level Objectives (SLOs):
```promql
# Availability SLI
sum(rate(http_server_requests_seconds_count{status!~"5.."}[30d])) /
sum(rate(http_server_requests_seconds_count[30d]))

# Latency SLI
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[30d])) < 0.5
```

### 4. Regular Dashboard Reviews

- Review dashboards weekly
- Update alert thresholds based on trends
- Add new metrics as system evolves

### 5. Log Retention

- Keep detailed logs for 30 days
- Archive logs for 1 year (compliance)
- Ensure GDPR compliance for user data in logs

### 6. Performance Baselines

- Establish baseline metrics during normal operation
- Compare current metrics against baseline
- Investigate significant deviations

### 7. Trace Critical Paths

- Ensure critical user journeys are traced
- Optimize slowest traces first
- Use distributed tracing to find bottlenecks

---

## Useful Queries

### PromQL Examples

```promql
# Request rate by status code
sum(rate(http_server_requests_seconds_count[5m])) by (status)

# Top 5 slowest endpoints
topk(5, histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])))

# Database connection pool saturation
hikaricp_connections_active / hikaricp_connections_max

# Memory pressure
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} > 0.8

# Error budget consumption (99.9% SLA)
1 - (sum(rate(http_server_requests_seconds_count{status!~"5.."}[30d])) / sum(rate(http_server_requests_seconds_count[30d])))
```

---

## Support

For monitoring issues or questions:
- Check Grafana dashboards first
- Review Prometheus alerts
- Check application logs
- Contact DevOps team at devops@belezza.ai
