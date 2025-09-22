import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import clientRoutes from './routes/clients';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import timeRoutes from './routes/time';
import commentRoutes from './routes/comments';
import fileRoutes from './routes/files';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Prisma Client with connection pooling
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error', 'warn'],
});

// Test database connection
prisma.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully')
  })
  .catch((error) => {
    logger.error('❌ Database connection failed:', error)
    process.exit(1)
  });

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
      ip: req.ip,
    });
    next();
  });
}

// Rate limiting - general
app.use('/api/', rateLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true, firstName: true, lastName: true, role: true }
    });

    if (!user || !user.isActive) {
      return next(new Error('Authentication error'));
    }

    // Attach user data to socket
    socket.data.user = user;
    next();
  } catch (err) {
    logger.error('Socket authentication error:', err);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info(`User connected: ${user.firstName} ${user.lastName} (${socket.id})`);

  // Join user to their personal room
  socket.on('join', (userId: string) => {
    if (userId === user.id) {
      socket.join(`user_${userId}`);
      logger.info(`User ${userId} joined their room`);
    }
  });

  // Join project rooms with permission check
  socket.on('join_project', async (projectId: string) => {
    try {
      // Verify user has access to project
      const hasAccess = await verifyProjectAccess(user.id, projectId, user.role);
      
      if (hasAccess) {
        socket.join(`project_${projectId}`);
        logger.info(`Socket ${socket.id} joined project room: ${projectId}`);
      } else {
        socket.emit('error', { message: 'אין הרשאה לפרויקט זה' });
      }
    } catch (error) {
      logger.error('Error joining project room:', error);
    }
  });

  // Leave project room
  socket.on('leave_project', (projectId: string) => {
    socket.leave(`project_${projectId}`);
    logger.info(`Socket ${socket.id} left project room: ${projectId}`);
  });

  // Timer events with validation
  socket.on('timer_start', async (data) => {
    try {
      // Broadcast to project members
      socket.to(`project_${data.projectId}`).emit('timer_started', {
        ...data,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      });
      
      // Create alert for project members
      await createTimerAlert(user.id, data.projectId, data.taskId, 'started');
    } catch (error) {
      logger.error('Error broadcasting timer start:', error);
    }
  });

  socket.on('timer_stop', async (data) => {
    try {
      socket.to(`project_${data.projectId}`).emit('timer_stopped', {
        ...data,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      });
      
      await createTimerAlert(user.id, data.projectId, data.taskId, 'stopped');
    } catch (error) {
      logger.error('Error broadcasting timer stop:', error);
    }
  });

  // Task updates
  socket.on('task_update', (data) => {
    socket.to(`project_${data.projectId}`).emit('task_updated', {
      ...data,
      updatedBy: `${user.firstName} ${user.lastName}`
    });
  });

  // Comment updates
  socket.on('new_comment', (data) => {
    socket.to(`project_${data.projectId}`).emit('comment_added', {
      ...data,
      authorId: user.id,
      author: `${user.firstName} ${user.lastName}`
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${user.firstName} ${user.lastName} (${socket.id}), reason: ${reason}`);
  });
});

// Helper functions
async function verifyProjectAccess(userId: string, projectId: string, role: string): Promise<boolean> {
  try {
    if (role === 'ADMIN' || role === 'EMPLOYEE') {
      return true;
    }
    
    // For clients, check if they have tasks in the project
    const access = await prisma.taskAssignment.findFirst({
      where: {
        clientId: userId,
        task: {
          projectId: projectId
        }
      }
    });
    
    return !!access;
  } catch (error) {
    logger.error('Error verifying project access:', error);
    return false;
  }
}

async function createTimerAlert(userId: string, projectId: string, taskId: string, action: string): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedUsers: true }
    });
    
    if (!task) return;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    
    // Create alerts for assigned users
    const alerts = task.assignedUsers
      .filter(au => au.userId && au.userId !== userId)
      .map(au => ({
        type: 'ACTIVE_TIMER' as const,
        title: `טיימר ${action === 'started' ? 'הופעל' : 'נעצר'}`,
        message: `${user?.firstName} ${user?.lastName} ${action === 'started' ? 'התחיל' : 'עצר'} לעבוד על ${task.title}`,
        receiverId: au.userId!,
        senderId: userId,
        taskId: taskId,
        projectId: projectId
      }));
    
    if (alerts.length > 0) {
      await prisma.alert.createMany({ data: alerts });
    }
  } catch (error) {
    logger.error('Error creating timer alert:', error);
  }
}

// Make io available globally
export { io };

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 CORS origin: ${process.env.CORS_ORIGIN}`);
  logger.info(`📝 Log level: ${process.env.LOG_LEVEL || 'info'}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close socket connections
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  // Close database connection
  await prisma.$disconnect();
  logger.info('Database connection closed');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});