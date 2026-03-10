# Security Testing Guide

This document describes how to run security scans on the Belezza API.

## OWASP Dependency Check

The OWASP Dependency Check plugin analyzes project dependencies and identifies known vulnerabilities (CVEs).

### Running the Scan

```bash
mvn dependency-check:check
```

### Configuration

The plugin is configured in `pom.xml` with the following settings:

- **CVSS Threshold**: 7 (High severity)
- **Fail Build on CVSS**: Yes, if any dependency has a CVSS score >= 7
- **Skip Test Scope**: Yes (test dependencies are not scanned)

### Report Location

After running the scan, the report will be generated at:
```
target/dependency-check-report.html
```

Open this file in a browser to view detailed vulnerability information.

### Understanding the Report

The report includes:
- **Dependency Name**: The name and version of the vulnerable dependency
- **CVE ID**: The Common Vulnerabilities and Exposures identifier
- **CVSS Score**: Severity score (0-10)
- **CWE**: Common Weakness Enumeration category
- **Description**: Details about the vulnerability
- **Recommendation**: How to fix (usually upgrade to a newer version)

### Suppressing False Positives

If the scan identifies false positives, you can suppress them:

1. Create a file `dependency-check-suppressions.xml` in the project root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">
    <suppress>
        <notes><![CDATA[
        Justification for suppression
        ]]></notes>
        <cve>CVE-2024-XXXXX</cve>
    </suppress>
</suppressions>
```

2. Add configuration to `pom.xml`:

```xml
<configuration>
    <suppressionFiles>
        <suppressionFile>dependency-check-suppressions.xml</suppressionFile>
    </suppressionFiles>
</configuration>
```

### CI/CD Integration

The dependency check can be integrated into your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run OWASP Dependency Check
  run: mvn dependency-check:check

- name: Upload Dependency Check Report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: dependency-check-report
    path: target/dependency-check-report.html
```

### Best Practices

1. **Run Regularly**: Run the scan at least weekly and before releases
2. **Update Dependencies**: Keep dependencies up to date to minimize vulnerabilities
3. **Review Carefully**: Not all reported vulnerabilities may affect your application
4. **Document Suppressions**: Always document why you're suppressing a CVE
5. **Monitor NVD**: Stay informed about new vulnerabilities in your dependencies

### Common Commands

```bash
# Run dependency check only
mvn dependency-check:check

# Update vulnerability database
mvn dependency-check:update-only

# Purge database and re-download
mvn dependency-check:purge

# Generate report without failing build
mvn dependency-check:check -Ddependency-check.failBuild=false
```

## Additional Security Testing

### Static Code Analysis

Use SpotBugs or SonarQube for static code analysis:

```bash
# SonarQube (requires SonarQube server)
mvn sonar:sonar \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-token
```

### Manual Security Review Checklist

- [ ] SQL Injection protection (use parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF protection (use Spring Security CSRF tokens)
- [ ] Secure password storage (use BCrypt)
- [ ] JWT secret is strong and stored securely
- [ ] HTTPS only in production
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Proper error handling (don't expose stack traces)
- [ ] Secure headers configured (HSTS, X-Frame-Options, etc.)

### Penetration Testing Tools

- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Security testing toolkit
- **Nikto**: Web server scanner

### Reporting Security Issues

If you discover a security vulnerability, please report it to:
- Email: security@belezza.ai
- Do not create public GitHub issues for security vulnerabilities
