#!/bin/bash

# YouTube API Setup Script
# This script helps configure YouTube API credentials and settings

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

# Function to validate YouTube API key
validate_api_key() {
    local api_key=$1
    
    log "Validating YouTube API key..."
    
    response=$(curl -s "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=$api_key" || echo "error")
    
    if echo "$response" | grep -q "error"; then
        error "Invalid YouTube API key or API not enabled"
    else
        log "YouTube API key is valid"
    fi
}

# Function to create OAuth credentials file
create_oauth_config() {
    local client_id=$1
    local client_secret=$2
    local redirect_uri=$3
    
    cat > packages/backend/config/youtube-oauth.json << EOF
{
  "web": {
    "client_id": "$client_id",
    "client_secret": "$client_secret",
    "redirect_uris": ["$redirect_uri"],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
  }
}
EOF
    
    log "OAuth configuration file created at packages/backend/config/youtube-oauth.json"
}

# Function to setup YouTube API configuration
setup_youtube_config() {
    info "Setting up YouTube API configuration..."
    
    # Create config directory if it doesn't exist
    mkdir -p packages/backend/config
    
    # Prompt for API credentials if not provided via environment
    if [ -z "$YOUTUBE_API_KEY" ]; then
        echo -n "Enter your YouTube API Key: "
        read -r YOUTUBE_API_KEY
    fi
    
    if [ -z "$YOUTUBE_CLIENT_ID" ]; then
        echo -n "Enter your YouTube OAuth Client ID: "
        read -r YOUTUBE_CLIENT_ID
    fi
    
    if [ -z "$YOUTUBE_CLIENT_SECRET" ]; then
        echo -n "Enter your YouTube OAuth Client Secret: "
        read -r YOUTUBE_CLIENT_SECRET
    fi
    
    if [ -z "$YOUTUBE_REDIRECT_URI" ]; then
        YOUTUBE_REDIRECT_URI="http://localhost:3001/auth/youtube/callback"
        info "Using default redirect URI: $YOUTUBE_REDIRECT_URI"
    fi
    
    # Validate API key
    validate_api_key "$YOUTUBE_API_KEY"
    
    # Create OAuth configuration
    create_oauth_config "$YOUTUBE_CLIENT_ID" "$YOUTUBE_CLIENT_SECRET" "$YOUTUBE_REDIRECT_URI"
    
    # Update environment file
    if [ -f ".env" ]; then
        # Update existing values or add new ones
        sed -i.bak "s/YOUTUBE_API_KEY=.*/YOUTUBE_API_KEY=$YOUTUBE_API_KEY/" .env
        sed -i.bak "s/YOUTUBE_CLIENT_ID=.*/YOUTUBE_CLIENT_ID=$YOUTUBE_CLIENT_ID/" .env
        sed -i.bak "s/YOUTUBE_CLIENT_SECRET=.*/YOUTUBE_CLIENT_SECRET=$YOUTUBE_CLIENT_SECRET/" .env
        sed -i.bak "s|YOUTUBE_REDIRECT_URI=.*|YOUTUBE_REDIRECT_URI=$YOUTUBE_REDIRECT_URI|" .env
        
        # Add if not exists
        grep -q "YOUTUBE_API_KEY=" .env || echo "YOUTUBE_API_KEY=$YOUTUBE_API_KEY" >> .env
        grep -q "YOUTUBE_CLIENT_ID=" .env || echo "YOUTUBE_CLIENT_ID=$YOUTUBE_CLIENT_ID" >> .env
        grep -q "YOUTUBE_CLIENT_SECRET=" .env || echo "YOUTUBE_CLIENT_SECRET=$YOUTUBE_CLIENT_SECRET" >> .env
        grep -q "YOUTUBE_REDIRECT_URI=" .env || echo "YOUTUBE_REDIRECT_URI=$YOUTUBE_REDIRECT_URI" >> .env
        
        log "Environment file updated with YouTube API credentials"
    else
        warn ".env file not found, please create one based on .env.example"
    fi
}

# Function to test YouTube API integration
test_youtube_integration() {
    log "Testing YouTube API integration..."
    
    # Test API key
    validate_api_key "$YOUTUBE_API_KEY"
    
    # Test OAuth flow (basic validation)
    oauth_url="https://accounts.google.com/o/oauth2/auth?client_id=$YOUTUBE_CLIENT_ID&redirect_uri=$YOUTUBE_REDIRECT_URI&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline"
    
    info "OAuth URL for testing: $oauth_url"
    info "You can test the OAuth flow by visiting the URL above"
    
    log "YouTube API integration setup completed successfully"
}

# Function to display setup instructions
display_instructions() {
    info "YouTube API Setup Instructions:"
    echo ""
    echo "1. Go to the Google Cloud Console (https://console.cloud.google.com/)"
    echo "2. Create a new project or select an existing one"
    echo "3. Enable the YouTube Data API v3"
    echo "4. Create credentials:"
    echo "   - API Key for server-to-server requests"
    echo "   - OAuth 2.0 Client ID for user authentication"
    echo "5. Configure OAuth consent screen"
    echo "6. Add authorized redirect URIs"
    echo ""
    echo "Required scopes:"
    echo "- https://www.googleapis.com/auth/youtube.upload"
    echo "- https://www.googleapis.com/auth/youtube.readonly"
    echo ""
    echo "Redirect URI should be: http://your-domain/auth/youtube/callback"
    echo ""
}

# Main execution
main() {
    log "Starting YouTube API setup"
    
    case "${1:-setup}" in
        "instructions")
            display_instructions
            ;;
        "test")
            test_youtube_integration
            ;;
        "setup"|*)
            setup_youtube_config
            test_youtube_integration
            ;;
    esac
    
    log "YouTube API setup completed!"
}

# Run main function
main "$@"