# Belezza API

Backend API for **Belezza.ai** - Social Studio for Beauty Salons.

Built with **Java 21** and **Spring Boot 3.2**.

## Requirements

- Java 21 (JDK)
- Maven 3.9+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

## Quick Start

### 1. Clone and Setup

```bash
cd belezza-api
cp .env.example .env
# Edit .env with your configurations
```

### 2. Start Infrastructure

```bash
docker-compose up -d db redis
```

### 3. Run Application

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Or with Docker:

```bash
docker-compose up -d
```

### 4. Access

- **API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health

## Project Structure

```
belezza-api/
├── src/main/java/com/belezza/api/
│   ├── config/         # Spring configurations
│   ├── controller/     # REST controllers
│   ├── service/        # Business logic
│   ├── repository/     # JPA repositories
│   ├── entity/         # JPA entities
│   ├── dto/            # Data transfer objects
│   ├── mapper/         # MapStruct mappers
│   ├── exception/      # Custom exceptions
│   ├── security/       # JWT and security
│   ├── integration/    # External APIs
│   ├── scheduler/      # Scheduled jobs
│   └── util/           # Utilities
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   ├── logback-spring.xml
│   └── db/migration/   # Flyway migrations
└── src/test/
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp API token | No |
| `META_APP_ID` | Meta Graph API App ID | No |
| `OPENAI_API_KEY` | OpenAI API key | No |
| `AWS_ACCESS_KEY_ID` | AWS credentials | No |

See `.env.example` for all variables.

### Profiles

- `dev` - Development (verbose logging, H2 console)
- `prod` - Production (optimized settings)
- `test` - Testing (H2 in-memory)

## Development

### Run Tests

```bash
./mvnw test
```

### Build

```bash
./mvnw clean package
```

### Code Coverage

```bash
./mvnw verify
# Report at: target/site/jacoco/index.html
```

## Docker

### Build Image

```bash
docker build -t belezza-api .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Start with dev tools (PgAdmin, Redis Commander)
docker-compose --profile tools up -d

# View logs
docker-compose logs -f api
```

## API Documentation

After starting the application, access:

- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/api-docs

## Tech Stack

- **Framework**: Spring Boot 3.2
- **Language**: Java 21
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **ORM**: Hibernate / Spring Data JPA
- **Migrations**: Flyway
- **Security**: Spring Security + JWT
- **Documentation**: SpringDoc OpenAPI
- **Mapping**: MapStruct
- **Testing**: JUnit 5, Mockito, Testcontainers

## License

Proprietary - All rights reserved.

---

*Belezza.ai - Social Studio for Beauty Salons*
