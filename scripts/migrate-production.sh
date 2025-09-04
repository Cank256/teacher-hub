#!/bin/bash

# Production Database Migration Script
# This script handles database migrations for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="./backups/migrations/$(date +%Y%m%d_%H%M%S)"
DRY_RUN=${2:-false}

# Function to validate database connection
validate_db_connection() {
    log "Validating database connection"
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
    fi
    
    # Test connection
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            log "Database connection successful"
        else
            error "Failed to connect to database"
        fi
    else
        error "psql command not found. Please install PostgreSQL client"
    fi
}

# Function to create database backup
create_backup() {
    log "Creating database backup"
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    backup_file="$BACKUP_DIR/full_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump "$DATABASE_URL" > "$backup_file"; then
        log "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        log "Backup compressed: $backup_file.gz"
        
        # Store backup metadata
        cat > "$BACKUP_DIR/backup_info.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "database_url": "$(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')",
  "backup_file": "$backup_file.gz",
  "migration_version": "$(npm run migrate:status --workspace=@teacher-hub/backend --silent 2>/dev/null || echo 'unknown')"
}
EOF
        
        log "Backup metadata saved: $BACKUP_DIR/backup_info.json"
    else
        error "Failed to create database backup"
    fi
}

# Function to check migration status
check_migration_status() {
    log "Checking current migration status"
    
    cd packages/backend
    
    # Get current migration status
    migration_status=$(npm run migrate:status --silent 2>/dev/null || echo "error")
    
    if [ "$migration_status" = "error" ]; then
        error "Failed to get migration status"
    fi
    
    info "Current migration status:"
    echo "$migration_status"
    
    cd ../..
}

# Function to run migrations
run_migrations() {
    log "Running database migrations"
    
    cd packages/backend
    
    if [ "$DRY_RUN" = "true" ]; then
        warn "DRY RUN MODE - No actual migrations will be executed"
        
        # Show what would be migrated
        info "Migrations that would be executed:"
        npm run migrate:status --silent 2>/dev/null || echo "Could not determine pending migrations"
        
        cd ../..
        return 0
    fi
    
    # Run migrations
    if npm run migrate:up; then
        log "Migrations completed successfully"
        
        # Get new migration status
        new_status=$(npm run migrate:status --silent 2>/dev/null || echo "unknown")
        info "New migration status:"
        echo "$new_status"
        
    else
        error "Migration failed"
    fi
    
    cd ../..
}

# Function to verify migration success
verify_migrations() {
    log "Verifying migration success"
    
    # Check if all expected tables exist
    expected_tables=(
        "users"
        "communities"
        "community_memberships"
        "posts"
        "post_likes"
        "post_comments"
        "messages"
        "resources"
        "youtube_videos"
        "user_searches"
        "moderation_queue"
    )
    
    for table in "${expected_tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
            log "✅ Table '$table' exists and is accessible"
        else
            error "❌ Table '$table' is missing or inaccessible"
        fi
    done
    
    # Check for required indexes
    log "Checking for required indexes"
    
    # This would be expanded based on actual index requirements
    required_indexes=(
        "idx_posts_author_id"
        "idx_posts_community_id"
        "idx_posts_created_at"
        "idx_community_memberships_user_id"
        "idx_community_memberships_community_id"
        "idx_messages_sender_id"
        "idx_messages_recipient_id"
        "idx_resources_author_id"
        "idx_user_searches_searcher_id"
    )
    
    for index in "${required_indexes[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM pg_indexes WHERE indexname = '$index';" | grep -q "1 row"; then
            log "✅ Index '$index' exists"
        else
            warn "⚠️  Index '$index' may be missing"
        fi
    done
    
    log "Migration verification completed"
}

# Function to rollback migrations if needed
rollback_migrations() {
    local rollback_steps=${1:-1}
    
    warn "Rolling back $rollback_steps migration step(s)"
    
    cd packages/backend
    
    for ((i=1; i<=rollback_steps; i++)); do
        if npm run migrate:down; then
            log "Rolled back migration step $i"
        else
            error "Failed to rollback migration step $i"
        fi
    done
    
    cd ../..
    
    log "Rollback completed"
}

# Function to restore from backup
restore_from_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        error "No backup file specified for restore"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    warn "Restoring database from backup: $backup_file"
    
    # Confirm restore
    read -p "This will overwrite the current database. Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        return 0
    fi
    
    # Restore database
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | psql "$DATABASE_URL"
    else
        psql "$DATABASE_URL" < "$backup_file"
    fi
    
    log "Database restored from backup"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment] [dry-run]"
    echo ""
    echo "Commands:"
    echo "  migrate [env] [dry-run]  - Run migrations (default)"
    echo "  status                   - Show migration status"
    echo "  rollback [steps]         - Rollback migrations"
    echo "  restore [backup_file]    - Restore from backup"
    echo "  backup                   - Create backup only"
    echo ""
    echo "Examples:"
    echo "  $0 production           - Run migrations in production"
    echo "  $0 production true      - Dry run migrations in production"
    echo "  $0 status               - Show current migration status"
    echo "  $0 rollback 2           - Rollback 2 migration steps"
    echo "  $0 restore backup.sql   - Restore from backup file"
}

# Main execution
main() {
    local command=${1:-migrate}
    
    # Load environment variables
    if [ -f ".env.$ENVIRONMENT" ]; then
        log "Loading environment variables for $ENVIRONMENT"
        export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
    elif [ -f ".env" ]; then
        log "Loading default environment variables"
        export $(cat .env | grep -v '^#' | xargs)
    else
        warn "No environment file found"
    fi
    
    case "$command" in
        "migrate")
            validate_db_connection
            create_backup
            check_migration_status
            run_migrations
            verify_migrations
            ;;
        "status")
            validate_db_connection
            check_migration_status
            ;;
        "rollback")
            validate_db_connection
            create_backup
            rollback_migrations "${2:-1}"
            ;;
        "restore")
            validate_db_connection
            restore_from_backup "$2"
            ;;
        "backup")
            validate_db_connection
            create_backup
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            ;;
    esac
    
    log "Migration script completed!"
}

# Run main function
main "$@"