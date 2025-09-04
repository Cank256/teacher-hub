#!/bin/bash

# Enhanced Platform Features Deployment Script
# This script handles deployment of the teacher hub platform with enhanced features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}Starting deployment for environment: $ENVIRONMENT${NC}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if environment file exists
if [ ! -f ".env.$ENVIRONMENT" ]; then
    error "Environment file .env.$ENVIRONMENT not found"
fi

# Load environment variables
log "Loading environment variables for $ENVIRONMENT"
export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)

# Validate required environment variables
log "Validating environment variables"
required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "YOUTUBE_API_KEY"
    "YOUTUBE_CLIENT_ID"
    "YOUTUBE_CLIENT_SECRET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "S3_BUCKET_NAME"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        error "Required environment variable $var is not set"
    fi
done

# Create backup directory
log "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup database
log "Creating database backup"
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database_backup.sql"
    log "Database backup created successfully"
else
    warn "pg_dump not found, skipping database backup"
fi

# Build applications
log "Building applications"
npm run build

# Run database migrations
log "Running database migrations"
npm run migrate:up --workspace=@teacher-hub/backend

# Start services with Docker Compose
log "Starting services with Docker Compose"
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml up -d

# Wait for services to be healthy
log "Waiting for services to be healthy"
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "Up (healthy)"; then
        log "Services are healthy"
        break
    fi
    
    if [ $counter -eq $timeout ]; then
        error "Services failed to become healthy within $timeout seconds"
    fi
    
    sleep 5
    counter=$((counter + 5))
done

# Run post-deployment health checks
log "Running post-deployment health checks"
./scripts/health-check.sh

# Clean up old Docker images
log "Cleaning up old Docker images"
docker image prune -f

log "Deployment completed successfully!"
log "Backup created at: $BACKUP_DIR"

# Send deployment notification (if configured)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Teacher Hub Platform deployed successfully to $ENVIRONMENT\"}" \
        "$SLACK_WEBHOOK_URL"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"