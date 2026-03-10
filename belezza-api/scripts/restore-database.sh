#!/bin/bash
# =============================================================================
# Belezza API - Database Restore Script
# =============================================================================
# This script restores a PostgreSQL database from a backup file.
#
# Usage:
#   ./restore-database.sh [options] <backup-file>
#
# Options:
#   -e, --environment    Environment (staging/production) [default: staging]
#   -s, --s3-bucket      S3 bucket to download backup from (optional)
#   -d, --dry-run        Show what would be done without executing
#   -h, --help           Show this help message
#
# Examples:
#   ./restore-database.sh backup.sql.gz
#   ./restore-database.sh -s belezza-backups belezza_production_20240101.sql.gz
#   ./restore-database.sh -e staging -d backup.sql.gz
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/belezza}"
ENVIRONMENT="staging"
S3_BUCKET=""
S3_PREFIX="database-backups"
DRY_RUN=false
BACKUP_FILE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
    head -25 "$0" | tail -20
    exit 0
}

check_dependencies() {
    local deps=("psql" "gunzip")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required command '$dep' not found."
            exit 1
        fi
    done

    if [[ -n "$S3_BUCKET" ]] && ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found but S3 bucket specified."
        exit 1
    fi
}

load_environment() {
    local env_file="${SCRIPT_DIR}/../.env.${ENVIRONMENT}"

    if [[ -f "$env_file" ]]; then
        log_info "Loading environment from $env_file"
        set -a
        source "$env_file"
        set +a
    fi

    if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
        log_error "DATABASE_URL or PGHOST environment variable not set"
        exit 1
    fi
}

download_from_s3() {
    local filename="$1"
    local local_path="${BACKUP_DIR}/${filename}"

    if [[ ! -f "$local_path" ]]; then
        log_info "Downloading backup from S3..."

        local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/${filename}"

        aws s3 cp "$s3_path" "$local_path"

        log_info "Download completed: $local_path"
    else
        log_info "Using existing local backup: $local_path"
    fi

    echo "$local_path"
}

confirm_restore() {
    log_warn "========================================="
    log_warn "  DATABASE RESTORE - ${ENVIRONMENT^^}"
    log_warn "========================================="
    log_warn ""
    log_warn "This will REPLACE ALL DATA in the ${ENVIRONMENT} database!"
    log_warn "Backup file: $BACKUP_FILE"
    log_warn ""

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore database from: $BACKUP_FILE"
        exit 0
    fi

    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup..."

    local pre_backup="${BACKUP_DIR}/pre_restore_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).sql.gz"

    if [[ -n "${DATABASE_URL:-}" ]]; then
        pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$pre_backup"
    else
        PGPASSWORD="${PGPASSWORD:-${DATABASE_PASSWORD:-}}" pg_dump \
            -h "${PGHOST:-localhost}" \
            -p "${PGPORT:-5432}" \
            -U "${PGUSER:-belezza}" \
            -d "${PGDATABASE:-belezza}" \
            --no-owner --no-privileges | gzip > "$pre_backup"
    fi

    log_info "Pre-restore backup created: $pre_backup"
}

restore_database() {
    log_info "Starting database restore..."

    local sql_file="$BACKUP_FILE"

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log_info "Decompressing backup..."
        sql_file="${BACKUP_FILE%.gz}"
        gunzip -k -f "$BACKUP_FILE"
    fi

    # Restore
    if [[ -n "${DATABASE_URL:-}" ]]; then
        psql "$DATABASE_URL" < "$sql_file"
    else
        PGPASSWORD="${PGPASSWORD:-${DATABASE_PASSWORD:-}}" psql \
            -h "${PGHOST:-localhost}" \
            -p "${PGPORT:-5432}" \
            -U "${PGUSER:-belezza}" \
            -d "${PGDATABASE:-belezza}" \
            < "$sql_file"
    fi

    # Cleanup decompressed file if we created it
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        rm -f "$sql_file"
    fi

    log_info "Database restore completed!"
}

verify_restore() {
    log_info "Verifying restore..."

    local count

    if [[ -n "${DATABASE_URL:-}" ]]; then
        count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM usuarios;" 2>/dev/null | tr -d ' ')
    else
        count=$(PGPASSWORD="${PGPASSWORD:-${DATABASE_PASSWORD:-}}" psql \
            -h "${PGHOST:-localhost}" \
            -p "${PGPORT:-5432}" \
            -U "${PGUSER:-belezza}" \
            -d "${PGDATABASE:-belezza}" \
            -t -c "SELECT COUNT(*) FROM usuarios;" 2>/dev/null | tr -d ' ')
    fi

    if [[ -n "$count" && "$count" -gt 0 ]]; then
        log_info "Verification passed: Found $count users in database"
        return 0
    else
        log_warn "Verification warning: No users found in database"
        return 1
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
            -s|--s3-bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                if [[ -z "$BACKUP_FILE" ]]; then
                    BACKUP_FILE="$1"
                else
                    log_error "Unknown option: $1"
                    show_help
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file is required"
        show_help
    fi

    log_info "========================================="
    log_info "Belezza Database Restore - ${ENVIRONMENT^}"
    log_info "========================================="

    check_dependencies
    load_environment

    # Download from S3 if needed
    if [[ -n "$S3_BUCKET" && ! -f "$BACKUP_FILE" ]]; then
        BACKUP_FILE=$(download_from_s3 "$(basename "$BACKUP_FILE")")
    fi

    # Verify backup file exists
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    confirm_restore
    create_pre_restore_backup
    restore_database
    verify_restore

    log_info "========================================="
    log_info "Restore completed successfully!"
    log_info "========================================="
}

main "$@"
