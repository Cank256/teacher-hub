#!/bin/bash

# Security Services Setup Script
# This script sets up file storage and security scanning services

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

# Function to setup file storage directories
setup_file_storage() {
    log "Setting up file storage directories"
    
    # Create upload directories
    directories=(
        "uploads"
        "uploads/temp"
        "uploads/profiles"
        "uploads/resources"
        "uploads/posts"
        "uploads/communities"
        "uploads/credentials"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        else
            info "Directory already exists: $dir"
        fi
    done
    
    # Set proper permissions
    chmod -R 755 uploads/
    log "Set permissions for upload directories"
    
    # Create .gitkeep files to preserve directory structure
    for dir in "${directories[@]}"; do
        if [ ! -f "$dir/.gitkeep" ]; then
            touch "$dir/.gitkeep"
        fi
    done
    
    log "File storage directories setup completed"
}

# Function to setup MinIO (S3-compatible storage)
setup_minio() {
    log "Setting up MinIO S3-compatible storage"
    
    # Check if MinIO is already running
    if docker ps | grep -q "teacher-hub-minio"; then
        warn "MinIO is already running"
        return 0
    fi
    
    # Start MinIO service
    docker-compose -f docker-compose.security.yml up -d minio
    
    # Wait for MinIO to be ready
    log "Waiting for MinIO to be ready..."
    timeout=60
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if curl -f http://localhost:9000/minio/health/live &> /dev/null; then
            log "MinIO is ready"
            break
        fi
        
        if [ $counter -eq $timeout ]; then
            error "MinIO failed to start within $timeout seconds"
        fi
        
        sleep 2
        counter=$((counter + 2))
    done
    
    # Configure MinIO buckets (requires mc client)
    if command -v mc &> /dev/null; then
        log "Configuring MinIO buckets"
        
        # Configure mc client
        mc alias set local http://localhost:9000 minioadmin minioadmin123
        
        # Create buckets
        buckets=("teacher-hub-files" "teacher-hub-videos" "teacher-hub-backups")
        
        for bucket in "${buckets[@]}"; do
            if ! mc ls local/$bucket &> /dev/null; then
                mc mb local/$bucket
                log "Created bucket: $bucket"
            else
                info "Bucket already exists: $bucket"
            fi
        done
        
        # Set bucket policies (public read for some buckets)
        mc policy set public local/teacher-hub-files
        log "Set public read policy for teacher-hub-files bucket"
        
    else
        warn "MinIO client (mc) not found, skipping bucket configuration"
        info "You can install it with: curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && chmod +x /usr/local/bin/mc"
    fi
    
    log "MinIO setup completed"
}

# Function to setup ClamAV antivirus
setup_clamav() {
    log "Setting up ClamAV antivirus scanner"
    
    # Check if ClamAV is already running
    if docker ps | grep -q "teacher-hub-clamav"; then
        warn "ClamAV is already running"
        return 0
    fi
    
    # Start ClamAV service
    docker-compose -f docker-compose.security.yml up -d clamav
    
    # Wait for ClamAV to be ready (this can take a while for initial setup)
    log "Waiting for ClamAV to be ready (this may take several minutes for initial setup)..."
    timeout=300
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if docker exec teacher-hub-clamav clamdscan --version &> /dev/null; then
            log "ClamAV is ready"
            break
        fi
        
        if [ $counter -eq $timeout ]; then
            error "ClamAV failed to start within $timeout seconds"
        fi
        
        sleep 10
        counter=$((counter + 10))
        
        # Show progress
        if [ $((counter % 60)) -eq 0 ]; then
            info "Still waiting for ClamAV... ($counter/$timeout seconds)"
        fi
    done
    
    # Test ClamAV
    log "Testing ClamAV scanner"
    if docker exec teacher-hub-clamav clamdscan --version; then
        log "ClamAV is working correctly"
    else
        error "ClamAV test failed"
    fi
    
    log "ClamAV setup completed"
}

# Function to setup content moderation service
setup_content_moderator() {
    log "Setting up content moderation service"
    
    # Check if content moderator is already running
    if docker ps | grep -q "teacher-hub-content-moderator"; then
        warn "Content moderator is already running"
        return 0
    fi
    
    # Build and start content moderation service
    docker-compose -f docker-compose.security.yml up -d content-moderator
    
    # Wait for content moderator to be ready
    log "Waiting for content moderator to be ready..."
    timeout=60
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if curl -f http://localhost:5000/health &> /dev/null; then
            log "Content moderator is ready"
            break
        fi
        
        if [ $counter -eq $timeout ]; then
            error "Content moderator failed to start within $timeout seconds"
        fi
        
        sleep 2
        counter=$((counter + 2))
    done
    
    # Test content moderator
    log "Testing content moderation service"
    response=$(curl -s http://localhost:5000/health)
    if echo "$response" | grep -q "healthy"; then
        log "Content moderator is working correctly"
    else
        error "Content moderator test failed"
    fi
    
    log "Content moderation service setup completed"
}

# Function to test all security services
test_security_services() {
    log "Testing all security services"
    
    # Test file storage
    test_file="test_file_$(date +%s).txt"
    echo "This is a test file" > "uploads/temp/$test_file"
    
    if [ -f "uploads/temp/$test_file" ]; then
        log "File storage test: PASSED"
        rm "uploads/temp/$test_file"
    else
        error "File storage test: FAILED"
    fi
    
    # Test MinIO
    if curl -f http://localhost:9000/minio/health/live &> /dev/null; then
        log "MinIO test: PASSED"
    else
        error "MinIO test: FAILED"
    fi
    
    # Test ClamAV
    if docker exec teacher-hub-clamav clamdscan --version &> /dev/null; then
        log "ClamAV test: PASSED"
    else
        error "ClamAV test: FAILED"
    fi
    
    # Test content moderator
    if curl -f http://localhost:5000/health &> /dev/null; then
        log "Content moderator test: PASSED"
    else
        error "Content moderator test: FAILED"
    fi
    
    log "All security services tests completed successfully"
}

# Function to display service status
show_service_status() {
    info "Security Services Status:"
    echo ""
    
    services=("teacher-hub-minio" "teacher-hub-clamav" "teacher-hub-content-moderator")
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$service"; then
            status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$service" | awk '{print $2, $3, $4}')
            echo -e "${GREEN}✅ $service: $status${NC}"
        else
            echo -e "${RED}❌ $service: Not running${NC}"
        fi
    done
    
    echo ""
    info "Service URLs:"
    echo "- MinIO Console: http://localhost:9001 (admin/minioadmin123)"
    echo "- MinIO API: http://localhost:9000"
    echo "- Content Moderator: http://localhost:5000"
    echo "- ClamAV: localhost:3310"
}

# Main execution
main() {
    log "Starting security services setup"
    
    case "${1:-all}" in
        "storage")
            setup_file_storage
            ;;
        "minio")
            setup_minio
            ;;
        "clamav")
            setup_clamav
            ;;
        "moderator")
            setup_content_moderator
            ;;
        "test")
            test_security_services
            ;;
        "status")
            show_service_status
            ;;
        "all"|*)
            setup_file_storage
            setup_minio
            setup_clamav
            setup_content_moderator
            test_security_services
            show_service_status
            ;;
    esac
    
    log "Security services setup completed!"
}

# Run main function
main "$@"