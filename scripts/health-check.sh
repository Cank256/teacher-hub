#!/bin/bash

# Health Check Script for Enhanced Platform Features
# This script performs comprehensive health checks for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-http://localhost:3001}
WEB_URL=${WEB_URL:-http://localhost:3000}
TIMEOUT=30

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    log "Checking $description: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        success "$description is healthy (HTTP $response)"
        return 0
    else
        error "$description failed (HTTP $response)"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    log "Checking database connectivity"
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not set"
        return 1
    fi
    
    # Try to connect to database
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            success "Database is accessible"
            return 0
        else
            error "Database connection failed"
            return 1
        fi
    else
        warn "psql not found, skipping database connectivity check"
        return 0
    fi
}

# Function to check Redis connectivity
check_redis() {
    log "Checking Redis connectivity"
    
    if [ -z "$REDIS_URL" ]; then
        error "REDIS_URL not set"
        return 1
    fi
    
    # Extract host and port from Redis URL
    redis_host=$(echo "$REDIS_URL" | sed -n 's/redis:\/\/\([^:]*\).*/\1/p')
    redis_port=$(echo "$REDIS_URL" | sed -n 's/redis:\/\/[^:]*:\([0-9]*\).*/\1/p')
    
    if [ -z "$redis_port" ]; then
        redis_port=6379
    fi
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "$redis_host" -p "$redis_port" ping | grep -q "PONG"; then
            success "Redis is accessible"
            return 0
        else
            error "Redis connection failed"
            return 1
        fi
    else
        warn "redis-cli not found, skipping Redis connectivity check"
        return 0
    fi
}

# Function to check file storage
check_file_storage() {
    log "Checking file storage configuration"
    
    # Check upload directories exist
    if [ ! -d "$UPLOAD_PATH" ]; then
        warn "Upload directory $UPLOAD_PATH does not exist, creating..."
        mkdir -p "$UPLOAD_PATH"
    fi
    
    if [ ! -d "$TEMP_UPLOAD_PATH" ]; then
        warn "Temp upload directory $TEMP_UPLOAD_PATH does not exist, creating..."
        mkdir -p "$TEMP_UPLOAD_PATH"
    fi
    
    # Check write permissions
    if [ -w "$UPLOAD_PATH" ] && [ -w "$TEMP_UPLOAD_PATH" ]; then
        success "File storage directories are writable"
        return 0
    else
        error "File storage directories are not writable"
        return 1
    fi
}

# Function to check YouTube API configuration
check_youtube_api() {
    log "Checking YouTube API configuration"
    
    required_vars=("YOUTUBE_API_KEY" "YOUTUBE_CLIENT_ID" "YOUTUBE_CLIENT_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "YouTube API variable $var is not set"
            return 1
        fi
    done
    
    success "YouTube API configuration is complete"
    return 0
}

# Function to check security services
check_security_services() {
    log "Checking security services"
    
    if [ "$ENABLE_VIRUS_SCANNING" = "true" ]; then
        # Check ClamAV connectivity
        if command -v clamdscan &> /dev/null; then
            if clamdscan --version &> /dev/null; then
                success "ClamAV is accessible"
            else
                error "ClamAV is not responding"
                return 1
            fi
        else
            warn "ClamAV not found, virus scanning may not work"
        fi
    fi
    
    return 0
}

# Main health check execution
main() {
    log "Starting comprehensive health check"
    
    failed_checks=0
    
    # Core service checks
    check_endpoint "$API_URL/health" 200 "Backend API Health" || ((failed_checks++))
    check_endpoint "$WEB_URL" 200 "Web Application" || ((failed_checks++))
    
    # Enhanced feature endpoints
    check_endpoint "$API_URL/api/posts" 401 "Posts API (expects auth)" || ((failed_checks++))
    check_endpoint "$API_URL/api/communities" 200 "Communities API" || ((failed_checks++))
    check_endpoint "$API_URL/api/messages" 401 "Messages API (expects auth)" || ((failed_checks++))
    check_endpoint "$API_URL/api/resources" 200 "Resources API" || ((failed_checks++))
    check_endpoint "$API_URL/api/admin" 401 "Admin API (expects auth)" || ((failed_checks++))
    
    # Infrastructure checks
    check_database || ((failed_checks++))
    check_redis || ((failed_checks++))
    check_file_storage || ((failed_checks++))
    check_youtube_api || ((failed_checks++))
    check_security_services || ((failed_checks++))
    
    # Summary
    if [ $failed_checks -eq 0 ]; then
        success "All health checks passed! 🎉"
        exit 0
    else
        error "$failed_checks health check(s) failed"
        exit 1
    fi
}

# Run main function
main "$@"