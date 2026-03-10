#!/bin/bash

# ==============================================
# Belezza API - Local Deployment Script
# ==============================================
# This script deploys the application locally using Docker Compose

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Belezza API - Local Deployment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install docker-compose and try again.${NC}"
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📂 Project directory: $PROJECT_DIR${NC}"
echo ""

# Load environment variables from .env if exists
if [ -f .env ]; then
    echo -e "${GREEN}✓ Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠ No .env file found. Using default values.${NC}"
    echo -e "${YELLOW}⚠ Create a .env file for custom configuration.${NC}"
fi
echo ""

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down
echo ""

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
./mvnw clean package -DskipTests
echo ""

# Build Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker-compose build api
echo ""

# Start all services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
echo -e "${BLUE}This may take a few minutes on first run...${NC}"

# Wait for database
echo -n "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U belezza > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Redis
echo -n "Waiting for Redis..."
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for API
echo -n "Waiting for API..."
for i in {1..60}; do
    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}   ✅ Deployment Successful!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "  • API:              ${GREEN}http://localhost:8080${NC}"
echo -e "  • Swagger UI:       ${GREEN}http://localhost:8080/swagger-ui.html${NC}"
echo -e "  • Actuator Health:  ${GREEN}http://localhost:8080/actuator/health${NC}"
echo -e "  • Actuator Metrics: ${GREEN}http://localhost:8080/actuator/prometheus${NC}"
echo -e "  • PostgreSQL:       ${GREEN}localhost:5432${NC}"
echo -e "  • Redis:            ${GREEN}localhost:6379${NC}"
echo -e "  • PgAdmin:          ${GREEN}http://localhost:5050${NC} (profile: tools)"
echo -e "  • Redis Commander:  ${GREEN}http://localhost:8081${NC} (profile: tools)"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "  • View logs:        ${YELLOW}docker-compose logs -f api${NC}"
echo -e "  • View all logs:    ${YELLOW}docker-compose logs -f${NC}"
echo -e "  • Stop services:    ${YELLOW}docker-compose down${NC}"
echo -e "  • Restart API:      ${YELLOW}docker-compose restart api${NC}"
echo ""
echo -e "${BLUE}🔧 Monitoring (Optional - use profile):${NC}"
echo -e "  ${YELLOW}docker-compose --profile monitoring up -d${NC}"
echo -e "  • Prometheus:       ${GREEN}http://localhost:9090${NC}"
echo -e "  • Grafana:          ${GREEN}http://localhost:3000${NC} (admin/admin)"
echo -e "  • Zipkin:           ${GREEN}http://localhost:9411${NC}"
echo ""
