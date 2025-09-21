# TimeTask - Hebrew Task Management System

A comprehensive task management system in Hebrew designed for software development and digital services companies.

## Features

- 🎯 **Complete Task Management**: Hierarchical tasks with subtasks
- ⏱️ **Time Tracking**: Multiple simultaneous timers with alerts
- 👥 **User Management**: Admin, Employee, and Client roles
- 🗂️ **Project Organization**: Templates and status tracking
- 💬 **Communication**: Comments, messages, and change history
- 📊 **Reporting**: Comprehensive reports with export options
- 🔔 **Alert System**: Real-time notifications and email alerts
- 📱 **Responsive Design**: Mobile and tablet support
- 🇮🇱 **Hebrew RTL**: Full right-to-left interface support

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI, Vite
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based permissions
- **File Storage**: Multer with version control
- **Real-time**: WebSocket connections

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run setup
   ```

2. **Set up database**:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

3. **Start development**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## User Roles

### System Administrator
- Full system management
- User management (create, edit, delete)
- System settings and configurations
- All reports and analytics

### Employees
- Create clients and projects
- Full task management
- Time tracking and timers
- Generate reports
- File uploads and comments

### Clients
- View their projects and tasks only
- Create tasks in their projects
- Comment on tasks
- View work times and reports
- Upload files

## Development Structure

```
timetask/
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared types and utilities
└── docs/           # Documentation
```

## Environment Setup

Copy the example environment files and configure:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

## Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure Hebrew RTL support for UI changes