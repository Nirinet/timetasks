import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { existsSync } from 'fs';

import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { cleanupInterval } from './middleware/loginRateLimiter';

import { logger } from './utils/logger';
import { disconnectRedis } from './utils/redis';
import { initMonitoring, metricsHandler, monitoringMiddleware } from './utils/monitoring';
import { setupSocketHandlers } from './sockets/handlers';

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

// Validate required environment variables before starting
const requiredEnvVars = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Production-specific warnings
if (process.env.NODE_ENV === 'production') {
  if ((process.env.JWT_SECRET?.length || 0) < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters for production security');
  }
  if (!process.env.CORS_ORIGIN) {
    logger.warn('CORS_ORIGIN not set - defaulting to localhost. Set it to your production domain');
  }
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set - rate limiting will use in-memory store (not suitable for cluster mode)');
  }
}

/**
 * Parse CORS_ORIGIN: supports single origin or comma-separated list.
 * Returns string for single origin, string[] for multiple.
 */
function parseCorsOrigin(): string | string[] {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  if (origin.includes(',')) {
    return origin.split(',').map(o => o.trim());
  }
  return origin;
}

const app = express();

// Trust first proxy (Nginx) - required for correct req.ip in rate limiting
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const server = createServer(app);
const corsOrigin = parseCorsOrigin();

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
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
  origin: corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'accessToken'];

  app.use((req, res, next) => {
    let sanitizedBody = req.body;
    if (req.body && typeof req.body === 'object') {
      sanitizedBody = { ...req.body };
      for (const field of SENSITIVE_FIELDS) {
        if (field in sanitizedBody) {
          sanitizedBody[field] = '[REDACTED]';
        }
      }
    }
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      body: sanitizedBody,
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

// Note: uploads are served through /api/files/download/:id with auth check
// Do NOT serve uploads directory statically - it bypasses authorization

const monitoringFlag = process.env.ENABLE_MONITORING ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false');
const isMonitoringEnabled = monitoringFlag.toLowerCase() === 'true';

if (isMonitoringEnabled) {
  initMonitoring();
  app.use(monitoringMiddleware);

  // Protect metrics endpoint with token auth when METRICS_TOKEN is set
  const metricsAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const metricsToken = process.env.METRICS_TOKEN;
    if (metricsToken) {
      const token = req.headers['authorization']?.replace('Bearer ', '');
      if (token !== metricsToken) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    next();
  };

  app.get('/metrics', metricsAuth, metricsHandler);
  logger.info('📈 Monitoring enabled at /metrics endpoint');
}

const serveFlag = process.env.SERVE_CLIENT ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false');
const shouldServeClient = serveFlag.toLowerCase() === 'true';
const clientBuildPath = path.resolve(__dirname, '../../client/dist');

if (shouldServeClient && existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Socket.IO setup - handlers extracted to sockets/handlers.ts
setupSocketHandlers(io, prisma);

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

  // Clear periodic cleanup intervals
  clearInterval(cleanupInterval);

  // Close Redis connection
  await disconnectRedis();
  logger.info('Redis connection closed');

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
  gracefulShutdown('unhandledRejection');
});