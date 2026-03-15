import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Service layer for alert-related business logic.
 * Extracted from index.ts for better separation of concerns.
 */
export class AlertService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create alerts for timer start/stop events.
   * Notifies all assigned users (except the one who triggered the timer).
   */
  async createTimerAlert(
    userId: string,
    projectId: string,
    taskId: string,
    action: 'started' | 'stopped'
  ): Promise<void> {
    try {
      const [task, user] = await Promise.all([
        this.prisma.task.findUnique({
          where: { id: taskId },
          include: { assignedUsers: true }
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        })
      ]);

      if (!task || !user) return;

      // Create alerts for assigned users (exclude the triggering user)
      const alerts = task.assignedUsers
        .filter(au => au.userId && au.userId !== userId)
        .map(au => ({
          type: 'ACTIVE_TIMER' as const,
          title: `טיימר ${action === 'started' ? 'הופעל' : 'נעצר'}`,
          message: `${user.firstName} ${user.lastName} ${action === 'started' ? 'התחיל' : 'עצר'} לעבוד על ${task.title}`,
          receiverId: au.userId!,
          senderId: userId,
          taskId: taskId,
          projectId: projectId
        }));

      if (alerts.length > 0) {
        await this.prisma.alert.createMany({ data: alerts });
      }
    } catch (error) {
      logger.error('Error creating timer alert:', error);
    }
  }

  /**
   * Create a task assignment alert.
   */
  async createTaskAlert(
    senderId: string,
    receiverId: string,
    taskId: string,
    projectId: string,
    type: 'NEW_TASK' | 'TASK_ASSIGNMENT' | 'STATUS_CHANGE' | 'PRIORITY_CHANGE',
    title: string,
    message: string
  ): Promise<void> {
    try {
      await this.prisma.alert.create({
        data: {
          type,
          title,
          message,
          senderId,
          receiverId,
          taskId,
          projectId
        }
      });
    } catch (error) {
      logger.error('Error creating task alert:', error);
    }
  }

  /**
   * Notify CLIENT users when a task status changes in their linked projects.
   * Finds all CLIENT-role users linked to the project's clients via ProjectClient.
   */
  async notifyClientUsersOnStatusChange(
    senderId: string,
    taskId: string,
    projectId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      const statusLabels: Record<string, string> = {
        NEW: 'חדש',
        IN_PROGRESS: 'בטיפול',
        WAITING_CLIENT: 'ממתין ללקוח',
        COMPLETED: 'הושלם'
      };

      // Find all clients linked to this project
      const projectClients = await this.prisma.projectClient.findMany({
        where: { projectId },
        select: { clientId: true }
      });

      if (projectClients.length === 0) return;

      const clientIds = projectClients.map(pc => pc.clientId);

      // Find all CLIENT-role users linked to these clients (exclude sender)
      const clientUsers = await this.prisma.user.findMany({
        where: {
          role: 'CLIENT',
          isActive: true,
          clientEntityId: { in: clientIds },
          id: { not: senderId }
        },
        select: { id: true }
      });

      if (clientUsers.length === 0) return;

      const alerts = clientUsers.map(u => ({
        type: 'STATUS_CHANGE' as const,
        title: 'שינוי סטטוס משימה',
        message: `המשימה "${taskTitle}" שונתה מ-"${statusLabels[oldStatus] || oldStatus}" ל-"${statusLabels[newStatus] || newStatus}"`,
        receiverId: u.id,
        senderId,
        taskId,
        projectId
      }));

      await this.prisma.alert.createMany({ data: alerts });
    } catch (error) {
      logger.error('Error notifying client users on status change:', error);
    }
  }
}
