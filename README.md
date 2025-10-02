# TimeTask - Hebrew Task Management System

A comprehensive task management system in Hebrew designed for software development and digital services companies.

## 🚀 Latest Updates (December 2024)

### Security & Performance Improvements
- ✅ **Added Error Boundary** for better error handling
- ✅ **Fixed Socket.IO Authentication** with JWT tokens
- ✅ **Implemented Login Rate Limiting** (5 attempts per 15 minutes)
- ✅ **Database Connection Pooling** configured
- ✅ **Timezone Handling** improved for time tracking
- ✅ **Updated Dependencies** to latest stable versions
- ✅ **Graceful Shutdown** handling added
- ✅ **Memory Leak Prevention** in Socket.IO connections
- ✅ **API Response Pagination** for better performance
- ✅ **Task Automations Stabilized**: automatic parent/project completion rules now run reliably
- ✅ **Docker Entrypoint**: automatic Prisma migrations when running in containers

## Features

- 🎯 **Complete Task Management**: Hierarchical tasks with subtasks
- ⏱️ **Time Tracking**: Multiple simultaneous timers (up to 3) with alerts
- 👥 **User Management**: Admin, Employee, and Client roles
- 🗂️ **Project Organization**: Templates and status tracking
- 💬 **Communication**: Comments, real-time messages, and change history
- 📊 **Reporting**: Comprehensive reports with export options
- 🔔 **Alert System**: Real-time notifications and email alerts
- 📱 **Responsive Design**: Mobile and tablet support
- 🇮🇱 **Hebrew RTL**: Full right-to-left interface support
- 🔒 **Enhanced Security**: Rate limiting, JWT auth, XSS protection

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI 5.15+, Vite 5
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database**: PostgreSQL with Prisma ORM (with connection pooling)
- **Authentication**: JWT with role-based permissions & rate limiting
- **File Storage**: Multer with version control
- **Real-time**: WebSocket connections with authentication
- **State Management**: React Query v5, Context API

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run setup
   ```

2. **Set up database**:
   ```bash
   cd server
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

3. **Configure environment**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   # Edit the .env files with your settings
   ```

4. **Start development**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

## 🐳 Docker Quick Start

> Want to try the full stack without installing Node.js? Use the simplified compose file.

1. **Copy environment templates** (optional but recommended):
   ```bash
   cp server/.env.example server/.env
   ```

2. **Build and start the stack**:
   ```bash
   docker compose -f docker-compose.simple.yml up --build
   ```

3. **Open the app**:
   - Application & API: http://localhost:3000

The container automatically runs database migrations on startup. To tear everything down:
```bash
docker compose -f docker-compose.simple.yml down -v
```

### 🪟 Windows / Docker Desktop (dev profile)

For contributors running the full development stack on Windows (Docker Desktop via WSL2 or Git Bash), make sure the TLS bundle required by Nginx exists **before** building the containers.

1. **Generate development certificates** (or copy your own `fullchain.pem`, `privkey.pem`, and `chain.pem` into `nginx/ssl/`):
   ```bash
   ./scripts/generate-dev-cert.sh
   ```

2. **Optional pre-flight check** – confirm the three files exist before continuing:
   ```bash
   test -f nginx/ssl/fullchain.pem \
     && test -f nginx/ssl/privkey.pem \
     && test -f nginx/ssl/chain.pem \
     && echo "SSL bundle ready" \
     || { echo "Missing SSL files – run scripts/generate-dev-cert.sh"; exit 1; }
   ```

3. **Start the compose stack with the development profile**:
   ```bash
   docker compose --profile dev up --build
   ```

> ℹ️ The helper script creates a local certificate authority and issues a `localhost` certificate for Nginx. Import `nginx/ssl/dev-ca.cert.pem` into Windows to avoid browser warnings, or replace the files with certificates signed by your own authority.

## Default Login Credentials

- **Admin**: admin@timetask.com / admin123
- **Employee**: employee@timetask.com / employee123
- **Client**: client@timetask.com / client123

## User Roles & Permissions

### System Administrator
- Full system management
- User management (create, edit, delete)
- System settings and configurations
- All reports and analytics
- Database maintenance

### Employees
- Create clients and projects
- Full task management
- Time tracking with multiple timers
- Generate reports
- File uploads and comments

### Clients
- View their projects and tasks only
- Create tasks in their projects
- Comment on tasks
- View work times and reports
- Upload files

## Project Structure

```
timetask/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard/  # Role-based dashboards
│   │   │   ├── Layout/     # App layout
│   │   │   └── ErrorBoundary.tsx  # Error handling
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API services
│   │   ├── theme/          # MUI theme
│   │   └── types/          # TypeScript types
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── loginRateLimiter.ts
│   │   ├── routes/         # API routes
│   │   ├── scripts/        # Utility scripts
│   │   ├── utils/          # Helper functions
│   │   └── index.ts        # Server entry point
│   └── prisma/
│       └── schema.prisma   # Database schema
└── docs/                   # Documentation
```

## Security Features

- 🔐 **JWT Authentication** with refresh tokens
- 🚫 **Rate Limiting**: General (100 req/15min) and login-specific (5 attempts/15min)
- 👮 **Role-based Access Control** (RBAC)
- 🛡️ **CORS Configuration** with credentials
- 🔑 **Password Strength Validation** (min 8 chars, upper, lower, digit)
- 💉 **SQL Injection Protection** via Prisma ORM
- 🦠 **XSS Protection** with Helmet middleware
- 🔌 **Socket.IO Authentication** with JWT
- 📝 **Audit Trail** for all changes

## Performance Optimizations

- ⚡ **Database Connection Pooling**
- 🗜️ **Response Compression** (gzip)
- 📄 **API Pagination** (max 100 records per request)
- 🔄 **React Query Caching** (5 min stale, 10 min cache)
- 🖼️ **Lazy Loading** for components
- 📊 **Optimized Database Queries**
- 🔌 **Socket.IO Reconnection** strategy
- 💾 **In-memory Rate Limiting**

## Monitoring & Logging

- 📊 **Health Endpoint**: `/health` with system metrics
- 📝 **Winston Logging**: Structured logs with levels
- 🚨 **Error Tracking**: Comprehensive error handling
- 📈 **Performance Monitoring**: Memory usage tracking
- 🔍 **Database Query Logging** (development mode)
- 📋 **User Activity Audit Trail**

## Production Deployment

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- PM2 for process management
- Nginx for reverse proxy

### Deployment Steps

1. **Build the application**:
   ```bash
   cd client && npm run build
   cd ../server && npm run build
   ```

2. **Set production environment variables**

3. **Run database migrations**:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

4. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   ```

### Environment Variables

Create `.env` files based on `.env.example` with proper production values:
- Strong JWT secrets (min 32 chars)
- Production database URL
- SMTP configuration for emails
- CORS origin for your domain

## Backup Strategy

### Database Backup
```bash
# Daily backup
pg_dump timetask_prod > backup_$(date +%Y%m%d).sql

# Restore
psql timetask_prod < backup_20240101.sql
```

### File Backup
```bash
# Backup uploads
tar -czf uploads_$(date +%Y%m%d).tar.gz uploads/
```

## Troubleshooting

### Common Issues & Solutions

1. **Database Connection Errors**
   - Check `DATABASE_URL` in `.env`
   - Verify PostgreSQL is running
   - Check connection pooling settings

2. **Socket.IO Connection Issues**
   - Verify `VITE_SOCKET_URL` in client `.env`
   - Check CORS settings
   - Ensure JWT token is valid

3. **Login Rate Limiting**
   - Wait 15 minutes after 5 failed attempts
   - Check logs for brute force alerts

4. **File Upload Failures**
   - Check `UPLOAD_DIR` permissions
   - Verify file size limits (50MB max)
   - Check allowed file types

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the code style (ESLint + Prettier)
4. Write tests for new features
5. Update documentation
6. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
- 📧 Email: support@timetask.com
- 🐛 Issues: GitHub Issues
- 📖 Docs: See `/docs` folder

---

## 🎉 System Status

✅ **Production Ready** - All critical issues resolved
- Security enhancements implemented
- Performance optimizations applied
- Error handling improved
- Real-time features secured

Last Updated: December 2024