# TimeTask Setup Guide

## Quick Start (Development)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### 1. Clone and Install Dependencies
```bash
cd timetask
npm run setup
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb timetask

# Configure environment
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit server/.env with your database URL:
DATABASE_URL="postgresql://username:password@localhost:5432/timetask?schema=public"
JWT_SECRET="your-super-secret-key"
```

### 3. Initialize Database
```bash
cd server
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Start Development Servers
```bash
# From root directory
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### 5. Login with Sample Accounts
- **Admin**: admin@timetask.com / admin123
- **Employee**: employee@timetask.com / employee123
- **Client**: client@timetask.com / client123

## Production Deployment

### Environment Variables

**Server (.env):**
```bash
DATABASE_URL="postgresql://prod-user:password@localhost:5432/timetask_prod"
JWT_SECRET="production-secret-very-long"
REFRESH_TOKEN_SECRET="production-refresh-secret"
NODE_ENV="production"
PORT=3000
SMTP_HOST="smtp.yourdomain.com"
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="your-smtp-password"
CORS_ORIGIN="https://yourdomain.com"
```

**Client (.env):**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
```

### Build and Deploy

```bash
# Build client
cd client && npm run build

# Build server
cd ../server && npm run build

# Start production server
npm start
```

### Nginx Configuration
```nginx
# Client (static files)
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/timetask/client/dist;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
cd server
pm2 start dist/index.js --name "timetask-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

## Features Overview

### ✅ Completed Features

#### Core System
- **Multi-role Authentication** (Admin/Employee/Client)
- **Hebrew RTL Interface** with Material-UI
- **Real-time Updates** via WebSocket
- **Responsive Design** for mobile/tablet

#### User Management
- Role-based permissions and access control
- User profile management
- Password change functionality

#### Client Management
- Client creation and management
- Contact information tracking
- Project association

#### Project Management
- Project creation with client assignment
- Status tracking (Active/On Hold/Completed)
- Budget and timeline management
- Project templates system

#### Task Management
- Hierarchical task system with subtasks
- Multiple user/client assignments
- Priority levels (1-4) with color coding
- Status workflow (New → In Progress → Waiting Client → Completed)
- File attachments
- Comments and discussions

#### Time Tracking
- Multiple simultaneous timers per employee
- Manual time entry and editing
- Forgotten timer alerts (configurable)
- Automatic duration calculations

#### Reporting System
- Hours summary by project/employee/period
- Employee performance metrics
- Project status reports
- Export to PDF/Excel/CSV

#### Communication
- Threaded comments on tasks
- Project-level discussions
- Change history logging
- Real-time notifications

#### File Management
- File upload with 50MB limit
- Version control
- Image/PDF preview support
- Configurable file type restrictions

### 🎯 Role-Based Dashboards

#### Admin Dashboard
- System statistics overview
- Recent tasks and projects
- Active employees list
- Performance metrics

#### Employee Dashboard
- Personal task list
- Active timers display
- Upcoming deadlines
- Weekly performance stats

#### Client Dashboard
- Project progress tracking
- Task overview
- Recent activity feed
- Quick actions menu

## Database Schema

### Core Tables
- **users** - System users with roles
- **clients** - Client companies
- **projects** - Client projects
- **tasks** - Task management with hierarchy
- **task_assignments** - User/client task assignments
- **time_records** - Time tracking entries
- **comments** - Task/project discussions
- **file_attachments** - File uploads
- **alerts** - Notification system
- **task_change_history** - Audit trail

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project with tasks
- `PUT /api/projects/:id` - Update project

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task

### Time Tracking
- `GET /api/time` - Get time records
- `POST /api/time/start` - Start timer
- `POST /api/time/stop/:id` - Stop timer
- `GET /api/time/active` - Get active timers
- `POST /api/time/manual` - Manual time entry

### Reports
- `GET /api/reports/hours` - Hours summary
- `GET /api/reports/project-status` - Project reports
- `GET /api/reports/employee-performance` - Performance reports

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control
- Rate limiting (100 requests/15min)
- CORS configuration
- Password strength validation
- SQL injection protection via Prisma ORM
- XSS protection with helmet middleware

## Performance Optimizations

- Database query optimization
- Image compression for uploads
- Gzip compression for API responses
- Connection pooling
- React Query for client-side caching
- Material-UI component optimization

## Monitoring & Logging

- Winston logging system
- Error tracking and reporting
- Performance monitoring
- Database query logging (development)
- User activity audit trail

## Backup Strategy

### Database Backup
```bash
# Daily backup
pg_dump timetask_prod > backup_$(date +%Y%m%d).sql

# Restore from backup
psql timetask_prod < backup_20240101.sql
```

### File Backup
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/timetask/uploads/
```

## Support & Maintenance

### Log Locations
- Application logs: `server/logs/`
- Nginx access logs: `/var/log/nginx/access.log`
- Nginx error logs: `/var/log/nginx/error.log`

### Health Checks
- API health: `GET /health`
- Database connectivity via Prisma
- WebSocket connection status

### Common Issues
1. **Database connection errors**: Check DATABASE_URL and PostgreSQL service
2. **CORS errors**: Verify CORS_ORIGIN setting
3. **File upload failures**: Check UPLOAD_DIR permissions
4. **Timer alerts not working**: Verify SMTP configuration

---

## 🎉 Project Complete!

This Hebrew task management system provides a comprehensive solution for software development companies with:

- **Complete user role management** (Admin/Employee/Client)
- **Full Hebrew RTL interface** with professional design
- **Advanced task management** with hierarchical structure
- **Multi-timer time tracking** with alerts
- **Comprehensive reporting** system
- **Real-time collaboration** features
- **File management** with version control
- **Mobile-responsive** design

The system is production-ready with proper security, error handling, and scalability features built in.