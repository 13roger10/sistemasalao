#!/bin/bash

# ==============================================
# Belezza API - Production Deployment Script
# ==============================================
# This script deploys the application to production servers
# Usage: ./deploy-production.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT="${1:-production}"

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Belezza API - ${ENVIRONMENT^^} Deployment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Load environment-specific configuration
CONFIG_FILE=".env.$ENVIRONMENT"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

source "$CONFIG_FILE"

# Validate required variables
REQUIRED_VARS=(
    "SERVER_HOST"
    "SERVER_USER"
    "SERVER_PORT"
    "DEPLOY_PATH"
    "DOCKER_IMAGE"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required variable $var is not set in $CONFIG_FILE${NC}"
        exit 1
    fi
done

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "  • Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "  • Server:      ${GREEN}$SERVER_HOST${NC}"
echo -e "  • User:        ${GREEN}$SERVER_USER${NC}"
echo -e "  • Deploy Path: ${GREEN}$DEPLOY_PATH${NC}"
echo -e "  • Docker Image:${GREEN}$DOCKER_IMAGE${NC}"
echo ""

# Confirmation
read -p "$(echo -e ${YELLOW}Are you sure you want to deploy to $ENVIRONMENT? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled.${NC}"
    exit 1
fi

# Pre-deployment checks
echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"

# Check SSH connectivity
if ! ssh -o ConnectTimeout=5 -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to server via SSH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection verified${NC}"

# Check Docker on remote server
if ! ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "docker --version" > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not available on remote server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker verified on remote server${NC}"

echo ""

# Backup current deployment
echo -e "${YELLOW}💾 Creating backup of current deployment...${NC}"
BACKUP_NAME="belezza-api-backup-$(date +%Y%m%d-%H%M%S)"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
    cd "$DEPLOY_PATH" || exit 1

    # Create backup directory
    mkdir -p backups

    # Backup current docker-compose.yml and .env
    if [ -f docker-compose.yml ]; then
        tar -czf "backups/$BACKUP_NAME.tar.gz" docker-compose.yml .env* 2>/dev/null || true
        echo "Backup created: $BACKUP_NAME.tar.gz"
    fi

    # Keep only last 5 backups
    cd backups
    ls -t *.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
EOF

echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Pull latest Docker image
echo -e "${YELLOW}🐳 Pulling latest Docker image...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "docker pull $DOCKER_IMAGE"
echo -e "${GREEN}✓ Docker image pulled${NC}"
echo ""

# Deploy application
echo -e "${YELLOW}🚀 Deploying application...${NC}"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
    cd "$DEPLOY_PATH" || exit 1

    # Stop current containers
    echo "Stopping current containers..."
    docker-compose down --remove-orphans || true

    # Update docker-compose.yml if needed
    # (You can scp or template the file here)

    # Start new containers
    echo "Starting new containers..."
    docker-compose up -d

    # Wait for health check
    echo "Waiting for application to be healthy..."
    for i in {1..30}; do
        if docker-compose exec -T api curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
            echo "Application is healthy!"
            break
        fi
        echo "Waiting... attempt \$i/30"
        sleep 5
    done

    # Prune old images
    docker image prune -f
EOF

echo -e "${GREEN}✓ Application deployed${NC}"
echo ""

# Post-deployment verification
echo -e "${YELLOW}🔍 Running post-deployment checks...${NC}"

# Determine health check URL
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_URL="https://staging-api.belezza.ai/actuator/health"
else
    HEALTH_URL="https://api.belezza.ai/actuator/health"
fi

# Check application health
echo -n "Checking application health..."
for i in {1..10}; do
    if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        HEALTH_STATUS="UP"
        break
    fi
    echo -n "."
    sleep 5
done

if [ "$HEALTH_STATUS" != "UP" ]; then
    echo -e " ${RED}✗${NC}"
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${YELLOW}You may need to rollback the deployment.${NC}"
    exit 1
fi

# Check metrics endpoint
if curl -f "$HEALTH_URL/../prometheus" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Metrics endpoint accessible${NC}"
fi

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}   ✅ Deployment Successful!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Details:${NC}"
echo -e "  • Environment:  ${GREEN}$ENVIRONMENT${NC}"
echo -e "  • Health URL:   ${GREEN}$HEALTH_URL${NC}"
echo -e "  • Backup:       ${GREEN}$BACKUP_NAME${NC}"
echo ""
echo -e "${BLUE}📝 Post-Deployment Tasks:${NC}"
echo -e "  1. Monitor application logs"
echo -e "  2. Check error rates in Grafana"
echo -e "  3. Verify critical endpoints"
echo -e "  4. Monitor user reports"
echo ""
echo -e "${BLUE}🔄 Rollback Command:${NC}"
echo -e "  ${YELLOW}./rollback.sh $ENVIRONMENT $BACKUP_NAME${NC}"
echo ""
