import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AlertService } from '../services/AlertService';
import { TaskService } from '../services/TaskService';

/**
 * Socket.IO handlers extracted from index.ts for better separation of concerns.
 * Handles real-time events: timer broadcasts, task updates, comments, and room management.
 */
export function setupSocketHandlers(io: Server, prisma: PrismaClient): void {
  const alertService = new AlertService(prisma);
  const taskService = new TaskService(prisma);

  // Authentication middleware
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

  // Connection handling
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
        const hasAccess = await taskService.verifyProjectAccess(user.id, projectId, user.role);

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
        socket.to(`project_${data.projectId}`).emit('timer_started', {
          ...data,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`
        });

        await alertService.createTimerAlert(user.id, data.projectId, data.taskId, 'started');
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

        await alertService.createTimerAlert(user.id, data.projectId, data.taskId, 'stopped');
      } catch (error) {
        logger.error('Error broadcasting timer stop:', error);
      }
    });

    // Task updates
    socket.on('task_update', (data) => {
      try {
        socket.to(`project_${data.projectId}`).emit('task_updated', {
          ...data,
          updatedBy: `${user.firstName} ${user.lastName}`
        });
      } catch (error) {
        logger.error('Error broadcasting task update:', error);
      }
    });

    // Comment updates
    socket.on('new_comment', (data) => {
      try {
        socket.to(`project_${data.projectId}`).emit('comment_added', {
          ...data,
          authorId: user.id,
          author: `${user.firstName} ${user.lastName}`
        });
      } catch (error) {
        logger.error('Error broadcasting new comment:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${user.firstName} ${user.lastName} (${socket.id}), reason: ${reason}`);
      // Socket.IO automatically removes socket from all rooms on disconnect
    });
  });
}
