# TimeTask Setup Guide - Complete Version

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ LTS and npm 9+
- PostgreSQL 14+
- Git
- Optional: PM2 for production

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/your-repo/timetask.git
cd timetask
npm run setup
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb timetask

# Or using psql
psql -U postgres -c "CREATE DATABASE timetask;"
```

### 3. Environment Configuration
```bash
# Copy environment templates
cp server/.env.example server/.env
cp client/.env.example client/.env
```

#### Edit `server/.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/timetask?schema=public"

# JWT Secrets (generate strong keys for production)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-min-32-chars"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV="development"
LOG_LEVEL="info"

# SMTP Email Configuration (optional for development)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@timetask.com"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES="jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar"

# Timer Alerts
TIMER_ALERT_INTERFACE_MINUTES=30
TIMER_ALERT_EMAIL_HOURS=2

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN="http://localhost:5173"
```

#### Edit `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Initialize Database
```bash
cd server

# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Seed database with sample data
npm run db:seed
```

### 5. Start Development Servers
```bash
# From root directory (runs both client and server)
npm run dev

# Or run separately:
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

### 6. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api-docs (if configured)

### 7. Default Login Accounts
| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | admin@timetask.com | admin123 | Full system access |
| **Employee** | employee@timetask.com | employee123 | Task & time management |
| **Client** | client@timetask.com | client123 | View-only access |

## 🏭 Production Deployment

### Server Requirements
- Ubuntu 20.04+ / RHEL 8+ / Debian 11+
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Node.js 18+ LTS
- PostgreSQL 14+
- Nginx 1.18+
- PM2 5+

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### 2. Database Setup
```bash
# Create production database and user
sudo -u postgres psql

CREATE USER timetask_user WITH PASSWORD 'strong_password_here';
CREATE DATABASE timetask_prod OWNER timetask_user;
GRANT ALL PRIVILEGES ON DATABASE timetask_prod TO timetask_user;
\q
```

### 3. Application Setup
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-repo/timetask.git
sudo chown -R $USER:$USER timetask
cd timetask

# Install dependencies
npm run setup

# Create production environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 4. Production Environment Variables

#### `server/.env`:
```env
# Database
DATABASE_URL="postgresql://timetask_user:strong_password@localhost:5432/timetask_prod?schema=public"

# JWT (use strong, unique secrets)
JWT_SECRET="<generate-with-openssl-rand-base64-32>"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="<generate-with-openssl-rand-base64-32>"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Server
NODE_ENV="production"
PORT=3000
LOG_LEVEL="error"

# Email
SMTP_HOST="smtp.yourdomain.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="smtp_password"
FROM_EMAIL="noreply@yourdomain.com"

# Security
CORS_ORIGIN="https://yourdomain.com"
BCRYPT_ROUNDS=12

# File Upload
UPLOAD_DIR="/var/www/timetask/uploads"
MAX_FILE_SIZE=52428800
```

#### Generate secure secrets:
```bash
# Generate JWT secrets
openssl rand -base64 32
```

### 5. Build Application
```bash
# Build client
cd client
npm run build

# Build server
cd ../server
npm run build

# Run migrations
npx prisma migrate deploy
```

### 6. PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'timetask-api',
    script: './server/dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Nginx Configuration

Create `/etc/nginx/sites-available/timetask`:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory for client files
    root /var/www/timetask/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Client routing (React)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # WebSocket proxy for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/timetask/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Security for hidden files
    location ~ /\. {
        deny all;
    }

    # Max upload size
    client_max_body_size 50M;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/timetask /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 9. Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 10. Create Upload Directory
```bash
sudo mkdir -p /var/www/timetask/uploads
sudo chown -R www-data:www-data /var/www/timetask/uploads
sudo chmod 755 /var/www/timetask/uploads
```

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Check application health
curl http://localhost:3000/health

# Monitor PM2 processes
pm2 monit
pm2 status

# View logs
pm2 logs timetask-api
```

### Log Management
```bash
# Application logs
tail -f /var/www/timetask/server/logs/combined.log
tail -f /var/www/timetask/server/logs/error.log

# PM2 logs
pm2 logs --lines 100

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Create backup script
cat > /home/ubuntu/backup-timetask.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/timetask"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="timetask_prod"
DB_USER="timetask_user"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Upload files backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/timetask/uploads/

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup-timetask.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-timetask.sh") | crontab -
```

### Updates and Deployment
```bash
# Pull latest code
cd /var/www/timetask
git pull origin main

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Build
cd ../client && npm run build
cd ../server && npm run build

# Run migrations
npx prisma migrate deploy

# Restart application
pm2 restart timetask-api
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U timetask_user -d timetask_prod -h localhost

# Check connection pool
# Add to server/.env: DATABASE_CONNECTION_LIMIT=10
```

### Socket.IO Connection Problems
```bash
# Check if port is listening
netstat -tlnp | grep 3000

# Test WebSocket
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:3000/socket.io/
```

### High Memory Usage
```bash
# Check PM2 memory
pm2 describe timetask-api

# Restart if needed
pm2 restart timetask-api

# Adjust memory limit in ecosystem.config.js
max_memory_restart: '500M'
```

### Login Rate Limiting Issues
```bash
# The system blocks after 5 failed attempts for 15 minutes
# Check logs for brute force attempts
grep "rate limit" /var/www/timetask/server/logs/error.log
```

### File Upload Problems
```bash
# Check permissions
ls -la /var/www/timetask/uploads/

# Fix permissions
sudo chown -R www-data:www-data /var/www/timetask/uploads/
sudo chmod 755 /var/www/timetask/uploads/

# Check disk space
df -h
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_time_records_employee ON time_records(employee_id);
CREATE INDEX idx_time_records_date ON time_records(date);

-- Analyze tables
ANALYZE tasks;
ANALYZE time_records;
```

### Node.js Optimization
```javascript
// In ecosystem.config.js
instances: 'max', // Use all CPU cores
exec_mode: 'cluster',
```

### Nginx Caching
```nginx
# Add to nginx config
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔒 Security Checklist

- ✅ Strong database passwords
- ✅ JWT secrets (min 32 characters)
- ✅ SSL/TLS enabled
- ✅ Firewall configured
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ File upload restrictions
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection (Helmet)
- ✅ Regular security updates
- ✅ Backup strategy implemented
- ✅ Monitoring configured
- ✅ Error logging enabled

## 🎉 Post-Installation

1. **Change default passwords** immediately
2. **Configure email settings** for notifications
3. **Set up monitoring** (optional: Datadog, New Relic)
4. **Configure CDN** (optional: CloudFlare)
5. **Run security audit**: `npm audit`
6. **Test all features** in production
7. **Document custom configurations**

---

## Support & Resources

- **Documentation**: `/docs` folder
- **API Reference**: Postman collection in `/docs/api`
- **Database Schema**: `/server/prisma/schema.prisma`
- **Logs**: `/server/logs/`
- **Community**: GitHub Issues

## Version Information

- **Application Version**: 1.0.0
- **Node.js Required**: 18+
- **PostgreSQL Required**: 14+
- **Last Updated**: December 2024

---

**🚀 Your TimeTask system is now ready for production use!**