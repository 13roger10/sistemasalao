# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml first for better layer caching
COPY pom.xml .

# Download dependencies (cached if pom.xml doesn't change)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application (skip tests for faster builds)
RUN mvn package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add curl for healthcheck
RUN apk add --no-cache curl

# SEC-B01: roda como usuário não-root. Antes o processo subia como root dentro do
# container, ampliando o impacto de uma eventual execução de código.
RUN addgroup -S belezza && adduser -S -G belezza -u 1001 belezza

# Logs em /tmp (sempre gravável, inclusive com readOnlyRootFilesystem no k8s, onde
# /tmp é um emptyDir). Evita depender da posse de /app pelo usuário não-root.
ENV LOG_PATH=/tmp/logs

# Copy the built jar (owned by the non-root user)
COPY --from=build --chown=belezza:belezza /app/target/*.jar app.jar

USER belezza

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
