# Load Testing Guide

This document describes how to run load tests on the Belezza API using Gatling.

## Prerequisites

1. **Running API**: The API must be running (locally or on a server)
2. **Test Data**: Ensure test users exist in the database
3. **Maven**: Maven must be installed

## Running Load Tests

### Basic Load Test

Run the default simulation (gradual ramp-up):

```bash
mvn gatling:test
```

### Custom Parameters

You can customize the load test with system properties:

```bash
# Test against different URL
mvn gatling:test -DbaseUrl=http://staging.belezza.ai

# Customize number of users
mvn gatling:test -Dusers=200

# Customize duration (seconds)
mvn gatling:test -Dduration=120

# Combine parameters
mvn gatling:test -DbaseUrl=http://localhost:8080 -Dusers=500 -Dduration=300
```

### Specific Simulation

Run a specific simulation class:

```bash
mvn gatling:test -Dgatling.simulationClass=com.belezza.api.performance.BasicSimulation
```

## Available Scenarios

### 1. Login Flow
- **Purpose**: Test authentication endpoint
- **Actions**: User login
- **Expected**: Fast response, high success rate

### 2. Get Profile
- **Purpose**: Test authenticated endpoints
- **Actions**: Login → Get user profile
- **Expected**: Token validation works under load

### 3. Get Metrics
- **Purpose**: Test complex queries and calculations
- **Actions**: Login → Get scheduling/financial/social metrics
- **Expected**: Database queries perform well under load

### 4. Health Check
- **Purpose**: Test monitoring endpoints
- **Actions**: GET /actuator/health
- **Expected**: Always available, fast response

## Load Injection Strategies

### Gradual Ramp-Up (Default)
```scala
rampUsers(100) during (60.seconds)
```
- Slowly increases load over time
- Good for finding system limits
- Realistic user behavior

### Spike Test
```scala
atOnceUsers(100)
```
- All users at once
- Tests system resilience
- Identifies bottlenecks

### Sustained Load
```scala
constantUsersPerSec(5) during (60.seconds)
```
- Constant rate of new users
- Tests long-term stability
- Memory leak detection

## Understanding Results

After running a test, Gatling generates an HTML report:

```
target/gatling/basicsimulation-{timestamp}/index.html
```

### Key Metrics

1. **Response Time**
   - Mean: Average response time
   - 95th Percentile: 95% of requests are faster than this
   - 99th Percentile: 99% of requests are faster than this
   - Max: Slowest request

2. **Throughput**
   - Requests/sec: Number of requests processed per second
   - Higher is better

3. **Success Rate**
   - Percentage of successful requests (HTTP 2xx/3xx)
   - Should be > 95% under normal load

4. **Active Users**
   - Number of concurrent virtual users
   - Shows load progression over time

### Performance Goals

| Metric | Target |
|--------|--------|
| Mean Response Time | < 1s |
| 95th Percentile | < 2s |
| 99th Percentile | < 5s |
| Success Rate | > 99% |
| Throughput | > 100 req/s |

## Test Scenarios

### Scenario 1: Normal Business Day
**Goal**: Simulate typical weekday traffic

```bash
mvn gatling:test -Dusers=50 -Dduration=600
```

**Expected**:
- 50 concurrent users
- 10 minutes duration
- ~5 requests/user/minute
- Total: ~2500 requests

### Scenario 2: Peak Hours (Monday Morning)
**Goal**: Simulate peak appointment booking time

```bash
mvn gatling:test -Dusers=200 -Dduration=300
```

**Expected**:
- 200 concurrent users
- 5 minutes duration
- High load on agendamento endpoints

### Scenario 3: Stress Test
**Goal**: Find system breaking point

```bash
mvn gatling:test -Dusers=1000 -Dduration=600
```

**Expected**:
- 1000 concurrent users
- System should handle gracefully or fail predictably
- Identify scalability limits

## Analyzing Performance Issues

### High Response Times

**Possible Causes**:
- Database slow queries → Check slow query log
- N+1 query problem → Add Hibernate logging
- CPU bottleneck → Monitor with `top` or APM
- Memory pressure → Check garbage collection

**Solutions**:
- Add database indexes
- Use query optimization
- Implement caching
- Scale horizontally

### Low Throughput

**Possible Causes**:
- Thread pool exhaustion
- Connection pool limits
- Network bandwidth
- External API delays

**Solutions**:
- Increase Tomcat threads
- Increase DB connection pool
- Use async processing
- Add timeouts to external calls

### High Error Rate

**Possible Causes**:
- Database connection timeout
- Out of memory errors
- Rate limiting kicked in
- Circuit breaker opened

**Solutions**:
- Increase timeouts
- Add more memory
- Implement backpressure
- Scale services

## Best Practices

1. **Start Small**: Begin with low load and increase gradually
2. **Monitor Resources**: Watch CPU, memory, disk I/O during tests
3. **Test Realistic Scenarios**: Mix read and write operations
4. **Use Production-Like Environment**: Test on similar infrastructure
5. **Run Multiple Times**: Average results from 3+ test runs
6. **Test Before Release**: Include load tests in CI/CD pipeline
7. **Set Baselines**: Record and compare performance over time

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          java-version: '21'

      - name: Start Application
        run: |
          mvn spring-boot:start &
          sleep 30  # Wait for app to start

      - name: Run Load Test
        run: mvn gatling:test -Dusers=100 -Dduration=120

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: gatling-report
          path: target/gatling/*/
```

## Troubleshooting

### "Connection refused" errors
- Ensure the API is running
- Check the baseUrl parameter
- Verify firewall settings

### "Out of memory" during test
- Reduce number of users
- Increase JVM memory: `export MAVEN_OPTS="-Xmx2g"`

### Test runs but no report generated
- Check `target/gatling/` directory
- Look for error messages in Maven output
- Verify Gatling plugin configuration

## Advanced Topics

### Custom Feeders

Create realistic test data:

```scala
val userFeeder = csv("users.csv").random
val searchFeeder = Iterator.continually(Map(
  "searchTerm" -> Random.alphanumeric.take(10).mkString
))
```

### Think Time

Add realistic pauses:

```scala
.pause(2, 5)  // Random pause between 2-5 seconds
```

### Assertions

Define success criteria:

```scala
.assertions(
  global.responseTime.percentile(95).lt(2000),
  global.successfulRequests.percent.gt(99),
  details("Login").responseTime.mean.lt(500)
)
```

## Resources

- [Gatling Documentation](https://gatling.io/docs/)
- [Performance Testing Best Practices](https://gatling.io/blog/)
- [Load Testing Checklist](https://gatling.io/load-testing/)
