# Code Coverage Guide

This document explains how to measure and improve code coverage for the Belezza API using JaCoCo.

## What is Code Coverage?

Code coverage measures the percentage of your code that is executed during automated tests. It helps identify:
- Untested code paths
- Dead code
- Areas needing more tests

## Running Coverage Analysis

### Generate Coverage Report

```bash
mvn clean test
```

JaCoCo automatically generates coverage reports during the test phase.

### View Coverage Report

Open the HTML report in your browser:

```
target/site/jacoco/index.html
```

### Coverage Enforcement

The build will **fail** if code coverage is below **80%**. This is configured in `pom.xml`:

```xml
<limit>
    <counter>LINE</counter>
    <value>COVEREDRATIO</value>
    <minimum>0.80</minimum>
</limit>
```

## Understanding the Report

### Report Structure

The JaCoCo report shows coverage at multiple levels:

1. **Package Level**: Overall coverage per package
2. **Class Level**: Coverage per class
3. **Method Level**: Coverage per method
4. **Line Level**: Which specific lines are covered

### Coverage Metrics

JaCoCo measures several types of coverage:

#### 1. Line Coverage
- **What**: Percentage of executable lines executed
- **Good Target**: > 80%
- **Example**: 234 of 250 lines = 93.6%

#### 2. Branch Coverage
- **What**: Percentage of decision branches executed
- **Good Target**: > 75%
- **Example**:
  ```java
  if (condition) {  // Branch 1
      doA();
  } else {         // Branch 2
      doB();
  }
  ```
  Both branches should be tested.

#### 3. Instruction Coverage
- **What**: Percentage of bytecode instructions executed
- **Technical metric**: Usually similar to line coverage

#### 4. Method Coverage
- **What**: Percentage of methods executed
- **Good Target**: > 90%

#### 5. Class Coverage
- **What**: Percentage of classes with at least one method executed
- **Good Target**: > 95%

#### 6. Cyclomatic Complexity
- **What**: Measures code complexity based on decision points
- **Good Target**: < 10 per method
- **High complexity**: Consider refactoring

### Color Coding

In the HTML report:
- 🟢 **Green**: Covered
- 🔴 **Red**: Not covered
- 🟡 **Yellow**: Partially covered (branches)

## Improving Coverage

### 1. Identify Gaps

Look for classes with low coverage:

```bash
# Find files with < 80% coverage
grep -r "class name" target/site/jacoco/*.xml | grep -v "0.8"
```

### 2. Write Missing Tests

**Example**: Service method not covered

```java
// Production code
public class AgendamentoService {
    public void cancelar(Long id, String motivo) {
        // Not tested!
        Agendamento agendamento = repository.findById(id)
            .orElseThrow(() -> new NotFoundException("Agendamento not found"));
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setMotivoCancelamento(motivo);
        repository.save(agendamento);
    }
}

// Add test
@Test
void shouldCancelAgendamento() {
    // Given
    Long id = 1L;
    String motivo = "Cliente solicitou";
    Agendamento agendamento = createAgendamento();
    when(repository.findById(id)).thenReturn(Optional.of(agendamento));

    // When
    service.cancelar(id, motivo);

    // Then
    verify(repository).save(argThat(a ->
        a.getStatus() == StatusAgendamento.CANCELADO &&
        a.getMotivoCancelamento().equals(motivo)
    ));
}
```

### 3. Test Edge Cases

Don't just test the happy path:

```java
@Test
void shouldThrowExceptionWhenAgendamentoNotFound() {
    // Given
    Long id = 999L;
    when(repository.findById(id)).thenReturn(Optional.empty());

    // When & Then
    assertThrows(NotFoundException.class, () -> service.cancelar(id, "motivo"));
}
```

### 4. Test All Branches

```java
// Production code
public String calcularStatus(int dias) {
    if (dias < 0) {
        return "ATRASADO";
    } else if (dias == 0) {
        return "HOJE";
    } else if (dias <= 7) {
        return "PROXIMOS_DIAS";
    } else {
        return "FUTURO";
    }
}

// Tests - cover ALL branches
@Test
void shouldReturnAtrasadoWhenNegative() {
    assertThat(service.calcularStatus(-1)).isEqualTo("ATRASADO");
}

@Test
void shouldReturnHojeWhenZero() {
    assertThat(service.calcularStatus(0)).isEqualTo("HOJE");
}

@Test
void shouldReturnProximosDiasWhenWithinWeek() {
    assertThat(service.calcularStatus(3)).isEqualTo("PROXIMOS_DIAS");
}

@Test
void shouldReturnFuturoWhenBeyondWeek() {
    assertThat(service.calcularStatus(10)).isEqualTo("FUTURO");
}
```

## Exclusions

### Exclude Generated Code

Add to `pom.xml`:

```xml
<configuration>
    <excludes>
        <exclude>**/*MapperImpl.class</exclude>
        <exclude>**/config/**</exclude>
        <exclude>**/dto/**</exclude>
        <exclude>**/entity/**</exclude>
    </excludes>
</configuration>
```

### When to Exclude

Exclude code that:
- Is auto-generated (MapStruct, Lombok)
- Is configuration only (no logic)
- Cannot be tested (e.g., main() method)
- Is deprecated and will be removed

**Don't exclude** code just because it's hard to test!

## Coverage Goals

### Minimum Requirements

| Component | Target |
|-----------|--------|
| Overall | 80% |
| Services | 90% |
| Repositories | 70% (queries tested in integration tests) |
| Controllers | 85% |
| Utils | 95% |

### Quality Over Quantity

**Bad**: 100% coverage with meaningless tests
```java
@Test
void testGetId() {
    entity.setId(1L);
    assertEquals(1L, entity.getId()); // Useless test
}
```

**Good**: 80% coverage with meaningful tests
```java
@Test
void shouldCalculateMetricsCorrectly() {
    // Tests actual business logic
    // Verifies edge cases
    // Ensures correct behavior
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests with Coverage
  run: mvn clean test

- name: Check Coverage
  run: mvn jacoco:check

- name: Upload Coverage Report
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: target/site/jacoco/
```

### SonarQube Integration

```bash
mvn clean verify sonar:sonar \
  -Dsonar.projectKey=belezza-api \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-token
```

## Common Issues

### Low Branch Coverage

**Problem**: High line coverage but low branch coverage

**Solution**: Test all conditional branches

```java
// Before: Only tests if (condition) == true
@Test
void shouldDoSomethingWhenTrue() {
    result = service.doSomething(true);
    assertThat(result).isEqualTo(expected);
}

// After: Test both branches
@Test
void shouldDoSomethingWhenTrue() {
    assertThat(service.doSomething(true)).isEqualTo(expected);
}

@Test
void shouldDoSomethingWhenFalse() {
    assertThat(service.doSomething(false)).isEqualTo(otherExpected);
}
```

### Uncovered Exception Handling

**Problem**: Catch blocks not covered

**Solution**: Test error scenarios

```java
@Test
void shouldHandleDatabaseError() {
    // Simulate database error
    when(repository.save(any())).thenThrow(new DataAccessException("DB error"));

    // Verify error handling
    assertThrows(ServiceException.class, () -> service.save(entity));
}
```

### Private Methods Not Covered

**Problem**: Private helper methods show as uncovered

**Solution**:
1. Test through public methods (preferred)
2. Make method package-private for testing
3. Consider if method should be public

## Best Practices

1. **Write Tests First** (TDD)
   - Naturally achieves high coverage
   - Ensures testable design

2. **Test Behavior, Not Implementation**
   - Focus on what, not how
   - Tests remain valid after refactoring

3. **Keep Tests Simple**
   - One assertion per test (when possible)
   - Clear arrange-act-assert structure

4. **Use Test Data Builders**
   ```java
   Agendamento agendamento = AgendamentoTestBuilder.builder()
       .withStatus(CONFIRMADO)
       .withCliente(cliente)
       .build();
   ```

5. **Mock External Dependencies**
   - Don't test external APIs
   - Use mocks for repositories in unit tests
   - Use Testcontainers for integration tests

6. **Regularly Review Coverage**
   - Make it part of code review
   - Track trends over time
   - Improve gradually

## Viewing Coverage in IDE

### IntelliJ IDEA

1. Run tests with coverage: `Run > Run with Coverage`
2. View inline markers showing covered/uncovered lines
3. Generate report: `Analyze > Show Coverage Data`

### Eclipse

1. Install EclEmma plugin
2. Run tests with coverage: `Coverage As > JUnit Test`
3. View coverage in Coverage view

### VS Code

1. Install "Coverage Gutters" extension
2. Run tests: `mvn test`
3. Command: `Coverage Gutters: Display Coverage`

## Reports and Dashboards

### Local HTML Report

```bash
mvn clean test
open target/site/jacoco/index.html
```

### XML Report for CI

```bash
# Report location
target/site/jacoco/jacoco.xml

# Use with tools like:
# - SonarQube
# - Codecov
# - Coveralls
```

### CSV Report for Analysis

```bash
# Report location
target/site/jacoco/jacoco.csv

# Import into spreadsheet for analysis
```

## Troubleshooting

### Coverage Not Generated

1. Check Maven output for errors
2. Ensure `jacoco-maven-plugin` in `pom.xml`
3. Run `mvn clean` first

### Coverage Shows 0%

1. Verify tests are actually running
2. Check JaCoCo agent is attached
3. Look for configuration conflicts

### Report Missing Methods

1. Methods may be inlined by compiler
2. Lambdas sometimes not reported correctly
3. Check if class is excluded

## Resources

- [JaCoCo Documentation](https://www.jacoco.org/jacoco/trunk/doc/)
- [JaCoCo Maven Plugin](https://www.jacoco.org/jacoco/trunk/doc/maven.html)
- [Code Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)
