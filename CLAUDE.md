# TimeTask — Claude Code Instructions

## Project Overview
Hebrew (RTL) task management & time tracking system for a software development company.
Full spec: `docs/SPECIFICATION.md`

## Tech Stack
- **Client**: React 18 + TypeScript, Vite, MUI v5, Socket.IO client, Recharts
- **Server**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, Socket.IO, node-cron
- **Deployment**: Docker Compose + Cloudflare Tunnel
- **Language**: All UI in Hebrew, RTL direction

## Project Structure
```
client/src/
  pages/          # Page components (Dashboard, TasksPage, etc.)
  components/     # Reusable UI components
  services/       # API service layer (axios)
  contexts/       # React contexts (Auth, Socket)
  utils/          # Formatting & export utilities
server/src/
  routes/         # Express route handlers
  services/       # Business logic (TaskService, AlertService, etc.)
  middleware/     # Auth, rate limiting, error handling
server/prisma/
  schema.prisma   # Database schema
```

## Key Commands
```bash
# Development
cd client && npm run dev     # Client dev server (Vite)
cd server && npm run dev     # Server dev server (nodemon)

# Database
cd server && npx prisma migrate dev    # Run migrations
cd server && npx prisma generate       # Generate client
cd server && npx prisma studio         # DB browser

# Production
docker compose -f docker-compose.prod.yml up --build -d
```

## Conventions
- All user-facing text in Hebrew
- RTL layout throughout
- Role-based access: ADMIN > EMPLOYEE > CLIENT
- CLIENT users see only their assigned projects/tasks
- Prisma for all DB access (no raw SQL)
- Express routes follow RESTful patterns at `/api/*`
- MUI v5 components with `sx` prop for styling
- date-fns with Hebrew locale for dates
- Toast notifications via react-hot-toast

## Important Notes
- First registered user automatically becomes ADMIN
- Max 3 concurrent timers per user
- File upload limit: 50MB, validated by MIME type + extension
- JWT: Access token (7 days) + Refresh token (30 days)
- Soft delete for users (isActive flag, preserves FK references)
- Cascading delete for projects (removes all related tasks, records, etc.)
