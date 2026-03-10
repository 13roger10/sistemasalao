#!/bin/bash

# ==============================================
# Belezza API - Rollback Script
# ==============================================
# This script rolls back to a previous deployment
# Usage: ./rollback.sh [staging|production] [backup-name]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
ENVIRONMENT="${1}"
BACKUP_NAME="${2}"

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production] [backup-name]${NC}"
    exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Belezza API - Rollback${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Load environment-specific configuration
CONFIG_FILE=".env.$ENVIRONMENT"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

source "$CONFIG_FILE"

echo -e "${YELLOW}📋 Rollback Configuration:${NC}"
echo -e "  • Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "  • Server:      ${GREEN}$SERVER_HOST${NC}"
echo ""

# List available backups if none specified
if [ -z "$BACKUP_NAME" ]; then
    echo -e "${YELLOW}📦 Available backups:${NC}"
    ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
        cd "$DEPLOY_PATH/backups" || exit 1
        ls -lht *.tar.gz 2>/dev/null | head -10
EOF
    echo ""
    echo -e "${YELLOW}Usage: $0 $ENVIRONMENT <backup-name>${NC}"
    echo -e "${YELLOW}Example: $0 $ENVIRONMENT belezza-api-backup-20240215-143022${NC}"
    exit 0
fi

# Confirmation
echo -e "${RED}⚠️  WARNING: This will rollback the $ENVIRONMENT deployment!${NC}"
read -p "$(echo -e ${YELLOW}Are you sure you want to rollback? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Rollback cancelled.${NC}"
    exit 1
fi

# Perform rollback
echo -e "${YELLOW}🔄 Performing rollback...${NC}"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
    cd "$DEPLOY_PATH" || exit 1

    # Check if backup exists
    if [ ! -f "backups/$BACKUP_NAME.tar.gz" ]; then
        echo -e "${RED}❌ Backup not found: $BACKUP_NAME.tar.gz${NC}"
        exit 1
    fi

    # Create a backup of current state before rollback
    CURRENT_BACKUP="belezza-api-pre-rollback-$(date +%Y%m%d-%H%M%S)"
    echo "Creating backup of current state: \$CURRENT_BACKUP"
    tar -czf "backups/\$CURRENT_BACKUP.tar.gz" docker-compose.yml .env* 2>/dev/null || true

    # Stop current containers
    echo "Stopping current containers..."
    docker-compose down --remove-orphans || true

    # Extract backup
    echo "Restoring from backup: $BACKUP_NAME"
    tar -xzf "backups/$BACKUP_NAME.tar.gz"

    # Start containers with restored configuration
    echo "Starting containers with restored configuration..."
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
EOF

echo ""

# Post-rollback verification
echo -e "${YELLOW}🔍 Verifying rollback...${NC}"

# Determine health check URL
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_URL="https://staging-api.belezza.ai/actuator/health"
else
    HEALTH_URL="https://api.belezza.ai/actuator/health"
fi

# Check application health
echo -n "Checking application health..."
HEALTH_STATUS="DOWN"
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
    echo -e "${RED}❌ Health check failed after rollback!${NC}"
    echo -e "${YELLOW}Please investigate the issue manually.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}   ✅ Rollback Successful!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}📊 Rollback Details:${NC}"
echo -e "  • Environment:  ${GREEN}$ENVIRONMENT${NC}"
echo -e "  • Restored From:${GREEN}$BACKUP_NAME${NC}"
echo -e "  • Health URL:   ${GREEN}$HEALTH_URL${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Monitor application logs for errors"
echo -e "  2. Verify critical functionality"
echo -e "  3. Investigate root cause of the issue"
echo -e "  4. Fix the issue before next deployment"
echo ""
