# Teacher Hub Platform Deployment Guide

This guide covers the deployment and configuration of the enhanced Teacher Hub platform with all new features including post management, community creation, enhanced messaging, resource sharing with video integration, and administrative management.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm 9+
- PostgreSQL client tools (psql, pg_dump)
- Git

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd teacher-hub-platform
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup services**:
   ```bash
   npm run setup:security
   npm run setup:youtube
   npm run setup:monitoring
   ```

4. **Deploy**:
   ```bash
   npm run deploy:production
   ```

## Environment Configuration

### Required Environment Variables

#### Database & Cache
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `ELASTICSEARCH_URL`: Elasticsearch connection string

#### Authentication & Security
- `JWT_SECRET`: JWT signing secret (change in production)
- `YOUTUBE_API_KEY`: YouTube Data API key
- `YOUTUBE_CLIENT_ID`: YouTube OAuth client ID
- `YOUTUBE_CLIENT_SECRET`: YouTube OAuth client secret

#### File Storage & Security
- `AWS_ACCESS_KEY_ID`: AWS S3 access key
- `AWS_SECRET_ACCESS_KEY`: AWS S3 secret key
- `S3_BUCKET_NAME`: S3 bucket for file storage
- `ENABLE_VIRUS_SCANNING`: Enable ClamAV scanning (true/false)
- `ENABLE_CONTENT_SCANNING`: Enable content moderation (true/false)

#### Monitoring & Alerting
- `SENTRY_DSN`: Sentry error tracking DSN
- `SLACK_WEBHOOK_URL`: Slack webhook for alerts
- `ADMIN_EMAIL`: Admin email for notifications

### Environment Files

- `.env.production`: Production configuration
- `.env.staging`: Staging configuration
- `.env`: Development configuration

## Deployment Scripts

### Main Deployment Script
```bash
./scripts/deploy.sh [environment] [dry-run]
```

Features:
- Environment validation
- Database backup
- Application build
- Database migrations
- Service health checks
- Rollback capability

### Database Migrations
```bash
./scripts/migrate-production.sh [command]
```

Commands:
- `migrate`: Run pending migrations
- `status`: Show migration status
- `rollback [steps]`: Rollback migrations
- `backup`: Create database backup
- `restore [file]`: Restore from backup

### Service Setup Scripts

#### Security Services
```bash
./scripts/setup-security-services.sh [service]
```

Sets up:
- File storage directories
- MinIO S3-compatible storage
- ClamAV antivirus scanner
- Content moderation service

#### YouTube API
```bash
./scripts/setup-youtube-api.sh [command]
```

Commands:
- `setup`: Configure YouTube API credentials
- `test`: Test API integration
- `instructions`: Show setup instructions

#### Monitoring
```bash
./scripts/setup-monitoring.sh [service]
```

Sets up:
- Prometheus metrics collection
- Grafana dashboards
- AlertManager notifications
- Loki log aggregation

## Docker Compose Configurations

### Base Services
```bash
docker-compose up -d
```

Includes:
- PostgreSQL database
- Redis cache
- Elasticsearch
- Backend API
- Web application

### With Security Services
```bash
docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d
```

Adds:
- ClamAV antivirus
- MinIO file storage
- Content moderation service

### With Monitoring
```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Adds:
- Prometheus
- Grafana
- AlertManager
- Loki & Promtail

### Full Stack
```bash
npm run docker:up:all
```

Starts all services including security and monitoring.

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install -y postgresql-client
```

### 2. Application Deployment

```bash
# Clone repository
git clone <repository-url> /opt/teacher-hub
cd /opt/teacher-hub

# Install dependencies
npm install

# Configure environment
cp .env.production .env
# Edit .env with production values

# Setup services
npm run setup:security
npm run setup:youtube
npm run setup:monitoring

# Deploy
npm run deploy:production
```

### 3. SSL/TLS Configuration

Create nginx configuration for HTTPS:

```bash
# Create nginx directory
mkdir -p nginx

# Generate SSL certificate (use Let's Encrypt in production)
sudo certbot --nginx -d teacherhub.ug -d api.teacherhub.ug

# Configure nginx (see nginx/nginx.conf example)
```

### 4. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## Health Checks

### Manual Health Check
```bash
npm run health-check
```

### Automated Monitoring

Access monitoring dashboards:
- **Grafana**: http://localhost:3003 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### Service URLs

Development:
- Web App: http://localhost:3000
- API: http://localhost:3001
- Admin: http://localhost:3001/admin

Production:
- Web App: https://teacherhub.ug
- API: https://api.teacherhub.ug
- Admin: https://api.teacherhub.ug/admin

## Backup and Recovery

### Database Backup
```bash
# Manual backup
npm run migrate:production backup

# Automated backup (add to cron)
0 2 * * * cd /opt/teacher-hub && npm run migrate:production backup
```

### File Storage Backup
```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup MinIO data
docker exec teacher-hub-minio mc mirror local/teacher-hub-files /backup/
```

### Recovery
```bash
# Restore database
npm run migrate:production restore /path/to/backup.sql

# Restore files
tar -xzf uploads-backup.tar.gz
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check configuration
npm run health-check

# Restart services
docker-compose restart [service-name]
```

#### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database logs
docker-compose logs postgres
```

#### File Upload Issues
```bash
# Check permissions
ls -la uploads/

# Check ClamAV status
docker exec teacher-hub-clamav clamdscan --version

# Check disk space
df -h
```

#### YouTube API Issues
```bash
# Test API key
npm run setup:youtube test

# Check quota usage in Google Cloud Console
```

### Log Locations

- Application logs: `packages/backend/logs/`
- Docker logs: `docker-compose logs [service]`
- System logs: `/var/log/`
- Nginx logs: `/var/log/nginx/`

### Performance Tuning

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### Redis Optimization
```bash
# Check memory usage
docker exec teacher-hub-redis redis-cli info memory

# Monitor commands
docker exec teacher-hub-redis redis-cli monitor
```

## Security Considerations

### File Upload Security
- All files scanned with ClamAV
- File type validation
- Size limitations enforced
- Secure file storage

### YouTube Integration Security
- OAuth 2.0 authentication
- API key rotation
- Rate limiting
- Unlisted video privacy

### Database Security
- Connection encryption
- Regular backups
- Access logging
- Query monitoring

### Network Security
- HTTPS enforcement
- Firewall configuration
- VPN access for admin
- Rate limiting

## Monitoring and Alerting

### Key Metrics
- API response times
- Error rates
- Database performance
- File upload success rates
- YouTube API quota usage
- Security scan results

### Alert Channels
- Email notifications
- Slack integration
- PagerDuty (optional)
- SMS alerts (optional)

### Dashboard Access
- Platform overview
- Service health
- Business metrics
- Security events

## Maintenance

### Regular Tasks
- Database maintenance
- Log rotation
- Security updates
- Backup verification
- Performance monitoring

### Update Procedure
1. Test in staging
2. Create backup
3. Deploy to production
4. Run health checks
5. Monitor for issues

## Support

For deployment issues:
1. Check this documentation
2. Review logs and monitoring
3. Test in staging environment
4. Contact development team

---

**Note**: This deployment guide covers the enhanced platform features. Ensure all environment variables are properly configured and all services are healthy before going live.