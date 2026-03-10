#!/bin/bash
# =============================================================================
# Belezza API - Database Backup Script
# =============================================================================
# This script creates a backup of the PostgreSQL database and optionally
# uploads it to AWS S3 for disaster recovery.
#
# Usage:
#   ./backup-database.sh [options]
#
# Options:
#   -e, --environment    Environment (staging/production) [default: production]
#   -r, --retention      Days to keep local backups [default: 7]
#   -s, --s3-bucket      S3 bucket for remote backup (optional)
#   -h, --help           Show this help message
#
# Requirements:
#   - pg_dump (PostgreSQL client)
#   - aws cli (for S3 uploads)
#   - gzip
#
# Cron Example (daily at 2 AM):
#   0 2 * * * /path/to/backup-database.sh -e production -r 7 -s belezza-backups
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/belezza}"
DATE=$(date +%Y%m%d_%H%M%S)
ENVIRONMENT="production"
RETENTION_DAYS=7
S3_BUCKET=""
S3_PREFIX="database-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

show_help() {
    head -35 "$0" | tail -25
    exit 0
}

check_dependencies() {
    local deps=("pg_dump" "gzip")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required command '$dep' not found. Please install it."
            exit 1
        fi
    done

    if [[ -n "$S3_BUCKET" ]] && ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found but S3 bucket specified. Please install aws cli."
        exit 1
    fi
}

load_environment() {
    # Load environment variables from .env file if exists
    local env_file="${SCRIPT_DIR}/../.env.${ENVIRONMENT}"

    if [[ -f "$env_file" ]]; then
        log_info "Loading environment from $env_file"
        set -a
        source "$env_file"
        set +a
    fi

    # Validate required environment variables
    if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
        log_error "DATABASE_URL or PGHOST environment variable not set"
        exit 1
    fi
}

create_backup() {
    local backup_file="${BACKUP_DIR}/belezza_${ENVIRONMENT}_${DATE}.sql"
    local compressed_file="${backup_file}.gz"

    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"

    log_info "Starting database backup..."

    if [[ -n "${DATABASE_URL:-}" ]]; then
        # Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
        pg_dump "$DATABASE_URL" \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            --format=plain \
            > "$backup_file"
    else
        # Use individual environment variables
        PGPASSWORD="${PGPASSWORD:-${DATABASE_PASSWORD:-}}" pg_dump \
            -h "${PGHOST:-localhost}" \
            -p "${PGPORT:-5432}" \
            -U "${PGUSER:-belezza}" \
            -d "${PGDATABASE:-belezza}" \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            --format=plain \
            > "$backup_file"
    fi

    log_info "Compressing backup..."
    gzip -9 "$backup_file"

    local size=$(du -h "$compressed_file" | cut -f1)
    log_info "Backup created: $compressed_file (Size: $size)"

    echo "$compressed_file"
}

upload_to_s3() {
    local backup_file="$1"

    if [[ -z "$S3_BUCKET" ]]; then
        log_info "No S3 bucket specified, skipping remote upload"
        return 0
    fi

    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/$(basename "$backup_file")"

    log_info "Uploading backup to S3: $s3_path"

    aws s3 cp "$backup_file" "$s3_path" \
        --storage-class STANDARD_IA \
        --sse AES256

    log_info "Upload completed successfully"

    # Set lifecycle for automatic deletion after 30 days (configured in S3)
    log_info "Backup uploaded to: $s3_path"
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    # Local cleanup
    find "$BACKUP_DIR" -name "belezza_${ENVIRONMENT}_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    local remaining=$(ls -1 "$BACKUP_DIR"/belezza_${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l || echo 0)
    log_info "Remaining local backups: $remaining"

    # S3 cleanup (handled by S3 lifecycle policies)
    if [[ -n "$S3_BUCKET" ]]; then
        log_info "S3 cleanup is handled by bucket lifecycle policies (30-day retention)"
    fi
}

verify_backup() {
    local backup_file="$1"

    log_info "Verifying backup integrity..."

    # Check file exists and is not empty
    if [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty or missing!"
        return 1
    fi

    # Test gzip integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted!"
        return 1
    fi

    # Check for essential tables
    if ! zcat "$backup_file" | grep -q "CREATE TABLE.*usuarios"; then
        log_warn "Backup may be incomplete - usuarios table not found"
    fi

    log_info "Backup verification passed"
    return 0
}

send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification (if webhook URL is set)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        [[ "$status" == "error" ]] && color="danger"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Belezza Database Backup - ${ENVIRONMENT^}\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null || true
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -s|--s3-bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    log_info "========================================="
    log_info "Belezza Database Backup - ${ENVIRONMENT^}"
    log_info "========================================="

    check_dependencies
    load_environment

    # Create backup
    BACKUP_FILE=$(create_backup)

    # Verify backup
    if ! verify_backup "$BACKUP_FILE"; then
        send_notification "error" "Backup verification failed for ${ENVIRONMENT}"
        exit 1
    fi

    # Upload to S3
    upload_to_s3 "$BACKUP_FILE"

    # Cleanup old backups
    cleanup_old_backups

    log_info "========================================="
    log_info "Backup completed successfully!"
    log_info "========================================="

    send_notification "success" "Database backup completed successfully. Size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

main "$@"
