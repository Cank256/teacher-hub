#!/bin/bash

# Monitoring and Alerting Setup Script
# This script sets up comprehensive monitoring for the enhanced platform features

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

# Function to create monitoring directories
create_monitoring_dirs() {
    log "Creating monitoring directories"
    
    directories=(
        "monitoring"
        "monitoring/grafana"
        "monitoring/grafana/provisioning"
        "monitoring/grafana/provisioning/datasources"
        "monitoring/grafana/provisioning/dashboards"
        "monitoring/grafana/dashboards"
        "monitoring/rules"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
}

# Function to setup Grafana provisioning
setup_grafana_provisioning() {
    log "Setting up Grafana provisioning"
    
    # Datasources configuration
    cat > monitoring/grafana/provisioning/datasources/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

    # Dashboards configuration
    cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log "Grafana provisioning configuration created"
}

# Function to create Grafana dashboards
create_grafana_dashboards() {
    log "Creating Grafana dashboards"
    
    # Teacher Hub Platform Overview Dashboard
    cat > monitoring/grafana/dashboards/teacher-hub-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Teacher Hub Platform Overview",
    "tags": ["teacher-hub"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Posts Created Today",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(posts_created_total[24h])",
            "legendFormat": "Posts"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 8}
      },
      {
        "id": 5,
        "title": "Communities Active",
        "type": "stat",
        "targets": [
          {
            "expr": "communities_active_total",
            "legendFormat": "Communities"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 8}
      },
      {
        "id": 6,
        "title": "Files Uploaded Today",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(files_uploaded_total[24h])",
            "legendFormat": "Files"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 18, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    log "Grafana dashboards created"
}

# Function to start monitoring services
start_monitoring_services() {
    log "Starting monitoring services"
    
    # Start monitoring stack
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # Wait for services to be ready
    log "Waiting for monitoring services to be ready..."
    
    services=(
        "prometheus:9090"
        "grafana:3000"
        "alertmanager:9093"
        "loki:3100"
    )
    
    for service in "${services[@]}"; do
        service_name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        timeout=60
        counter=0
        
        while [ $counter -lt $timeout ]; do
            if curl -f http://localhost:$port/api/v1/status/buildinfo &> /dev/null || \
               curl -f http://localhost:$port/api/health &> /dev/null || \
               curl -f http://localhost:$port/ready &> /dev/null || \
               curl -f http://localhost:$port &> /dev/null; then
                log "✅ $service_name is ready"
                break
            fi
            
            if [ $counter -eq $timeout ]; then
                error "$service_name failed to start within $timeout seconds"
            fi
            
            sleep 2
            counter=$((counter + 2))
        done
    done
    
    log "All monitoring services are ready"
}

# Function to configure alert notifications
configure_alert_notifications() {
    log "Configuring alert notifications"
    
    # Update AlertManager configuration with actual values
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        sed -i.bak "s|YOUR_SLACK_WEBHOOK_URL|$SLACK_WEBHOOK_URL|g" monitoring/alertmanager.yml
        log "Slack webhook URL configured"
    else
        warn "SLACK_WEBHOOK_URL not set, using placeholder"
    fi
    
    if [ ! -z "$ADMIN_EMAIL" ]; then
        sed -i.bak "s|admin@teacherhub.ug|$ADMIN_EMAIL|g" monitoring/alertmanager.yml
        log "Admin email configured"
    else
        warn "ADMIN_EMAIL not set, using default"
    fi
    
    # Restart AlertManager to pick up configuration changes
    docker-compose -f docker-compose.monitoring.yml restart alertmanager
    
    log "Alert notifications configured"
}

# Function to test monitoring setup
test_monitoring_setup() {
    log "Testing monitoring setup"
    
    # Test Prometheus
    if curl -f http://localhost:9090/api/v1/status/buildinfo &> /dev/null; then
        log "✅ Prometheus is accessible"
    else
        error "❌ Prometheus is not accessible"
    fi
    
    # Test Grafana
    if curl -f http://localhost:3003/api/health &> /dev/null; then
        log "✅ Grafana is accessible"
    else
        error "❌ Grafana is not accessible"
    fi
    
    # Test AlertManager
    if curl -f http://localhost:9093/api/v1/status &> /dev/null; then
        log "✅ AlertManager is accessible"
    else
        error "❌ AlertManager is not accessible"
    fi
    
    # Test Loki
    if curl -f http://localhost:3100/ready &> /dev/null; then
        log "✅ Loki is accessible"
    else
        error "❌ Loki is not accessible"
    fi
    
    # Test if metrics are being collected
    sleep 10
    metrics_count=$(curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result | length' 2>/dev/null || echo "0")
    
    if [ "$metrics_count" -gt "0" ]; then
        log "✅ Metrics are being collected ($metrics_count targets)"
    else
        warn "⚠️  No metrics found, check target configuration"
    fi
    
    log "Monitoring setup test completed"
}

# Function to show monitoring URLs
show_monitoring_urls() {
    info "Monitoring Services URLs:"
    echo ""
    echo -e "${GREEN}📊 Grafana Dashboard:${NC} http://localhost:3003 (admin/admin123)"
    echo -e "${GREEN}🔍 Prometheus:${NC} http://localhost:9090"
    echo -e "${GREEN}🚨 AlertManager:${NC} http://localhost:9093"
    echo -e "${GREEN}📋 Loki:${NC} http://localhost:3100"
    echo -e "${GREEN}📈 Node Exporter:${NC} http://localhost:9100"
    echo -e "${GREEN}🐳 cAdvisor:${NC} http://localhost:8080"
    echo ""
    info "Default Grafana credentials: admin / admin123"
    info "Change the default password on first login"
}

# Function to create monitoring documentation
create_monitoring_docs() {
    log "Creating monitoring documentation"
    
    cat > monitoring/README.md << 'EOF'
# Teacher Hub Platform Monitoring

This directory contains the monitoring and alerting configuration for the Teacher Hub platform.

## Services

- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **AlertManager**: Alert handling and notifications
- **Loki**: Log aggregation
- **Promtail**: Log collection
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

## Quick Start

1. Start monitoring services:
   ```bash
   ./scripts/setup-monitoring.sh
   ```

2. Access Grafana: http://localhost:3003 (admin/admin123)

3. View alerts: http://localhost:9093

## Configuration

### Adding New Metrics

1. Add metric collection to your service
2. Update `prometheus.yml` with new scrape target
3. Create/update Grafana dashboards
4. Add relevant alert rules

### Alert Configuration

Edit `alertmanager.yml` to configure:
- Email notifications
- Slack integration
- PagerDuty integration
- Custom webhooks

### Dashboard Management

Dashboards are provisioned automatically from `grafana/dashboards/` directory.

## Troubleshooting

### Service Not Starting
- Check Docker logs: `docker-compose -f docker-compose.monitoring.yml logs [service]`
- Verify configuration files
- Check port conflicts

### No Metrics
- Verify scrape targets in Prometheus
- Check service health endpoints
- Review firewall/network settings

### Alerts Not Firing
- Check alert rules syntax
- Verify AlertManager configuration
- Test notification channels
EOF

    log "Monitoring documentation created"
}

# Main execution
main() {
    log "Starting monitoring and alerting setup"
    
    case "${1:-all}" in
        "dirs")
            create_monitoring_dirs
            ;;
        "grafana")
            setup_grafana_provisioning
            create_grafana_dashboards
            ;;
        "start")
            start_monitoring_services
            ;;
        "alerts")
            configure_alert_notifications
            ;;
        "test")
            test_monitoring_setup
            ;;
        "urls")
            show_monitoring_urls
            ;;
        "docs")
            create_monitoring_docs
            ;;
        "all"|*)
            create_monitoring_dirs
            setup_grafana_provisioning
            create_grafana_dashboards
            start_monitoring_services
            configure_alert_notifications
            test_monitoring_setup
            show_monitoring_urls
            create_monitoring_docs
            ;;
    esac
    
    log "Monitoring and alerting setup completed!"
}

# Run main function
main "$@"