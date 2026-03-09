import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';

/**
 * Background job scheduler for automated alerts.
 * Runs periodic checks for:
 * - Forgotten (long-running) timers
 * - Approaching deadlines
 * - Exceeded deadlines
 */
export class SchedulerService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private tasks: cron.ScheduledTask[] = [];

  constructor(prisma: PrismaClient, emailService: EmailService) {
    this.prisma = prisma;
    this.emailService = emailService;
  }

  /**
   * Start all scheduled jobs.
   */
  start(): void {
    // Check for forgotten timers every 15 minutes
    this.tasks.push(
      cron.schedule('*/15 * * * *', () => {
        this.checkForgottenTimers().catch(err =>
          logger.error('Scheduler: forgotten timer check failed', err)
        );
      })
    );

    // Check for approaching deadlines every hour
    this.tasks.push(
      cron.schedule('0 * * * *', () => {
        this.checkApproachingDeadlines().catch(err =>
          logger.error('Scheduler: approaching deadline check failed', err)
        );
      })
    );

    // Check for exceeded deadlines every hour
    this.tasks.push(
      cron.schedule('0 * * * *', () => {
        this.checkExceededDeadlines().catch(err =>
          logger.error('Scheduler: exceeded deadline check failed', err)
        );
      })
    );

    logger.info('⏰ Scheduler started (3 jobs registered)');
  }

  /**
   * Stop all scheduled jobs for graceful shutdown.
   */
  stop(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('⏰ Scheduler stopped');
  }

  /**
   * Get timer alert threshold from SystemSettings (default 120 minutes).
   */
  private async getTimerAlertMinutes(): Promise<number> {
    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key: 'timer_alert_minutes' }
      });
      return setting ? parseInt(setting.value) || 120 : 120;
    } catch {
      return 120;
    }
  }

  /**
   * Check for active timers that have been running longer than the threshold.
   * Creates ACTIVE_TIMER alerts and optionally sends emails.
   */
  private async checkForgottenTimers(): Promise<void> {
    const thresholdMinutes = await this.getTimerAlertMinutes();
    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const activeTimers = await this.prisma.timeRecord.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { lt: thresholdTime },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, emailNotifications: true, timerAlerts: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
    });

    for (const timer of activeTimers) {
      if (!timer.employee || !timer.task) continue;

      // Check if alert already sent in last hour (avoid spamming)
      const recentAlert = await this.prisma.alert.findFirst({
        where: {
          type: 'ACTIVE_TIMER',
          receiverId: timer.employee.id,
          taskId: timer.task.id,
          createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
        },
      });

      if (recentAlert) continue;

      const durationMinutes = Math.round((Date.now() - timer.startTime.getTime()) / (60 * 1000));

      // Create in-app alert
      await this.prisma.alert.create({
        data: {
          type: 'ACTIVE_TIMER',
          title: 'טיימר פעיל שכוח',
          message: `הטיימר שלך במשימה "${timer.task.title}" פעיל כבר ${durationMinutes} דקות`,
          receiverId: timer.employee.id,
          taskId: timer.task.id,
          projectId: timer.task.projectId,
        },
      });

      // Send email if user has alerts enabled
      if (timer.employee.emailNotifications && timer.employee.timerAlerts) {
        await this.emailService.sendTimerAlertEmail(
          timer.employee.email,
          timer.task.title,
          durationMinutes,
          timer.employee.firstName
        );
      }

      logger.info('Forgotten timer alert sent', {
        userId: timer.employee.id,
        taskId: timer.task.id,
        durationMinutes,
      });
    }
  }

  /**
   * Check for tasks with deadlines approaching within 24 hours.
   * Creates DEADLINE_APPROACHING alerts.
   */
  private async checkApproachingDeadlines(): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        deadline: { gt: now, lte: in24Hours },
        status: { not: 'COMPLETED' },
      },
      include: {
        assignedUsers: {
          include: {
            user: { select: { id: true, firstName: true, email: true, emailNotifications: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of tasks) {
      for (const assignment of task.assignedUsers) {
        if (!assignment.user) continue;

        // Check if alert already sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            type: 'DEADLINE_APPROACHING',
            receiverId: assignment.user.id,
            taskId: task.id,
            createdAt: { gte: today },
          },
        });

        if (existingAlert) continue;

        // Create in-app alert
        await this.prisma.alert.create({
          data: {
            type: 'DEADLINE_APPROACHING',
            title: 'דדליין מתקרב',
            message: `למשימה "${task.title}" דדליין ב-${task.deadline!.toLocaleDateString('he-IL')}`,
            receiverId: assignment.user.id,
            taskId: task.id,
            projectId: task.project?.id,
          },
        });

        // Send email
        if (assignment.user.emailNotifications) {
          await this.emailService.sendDeadlineAlertEmail(
            assignment.user.email,
            task.title,
            task.deadline!,
            assignment.user.firstName,
            false
          );
        }
      }
    }
  }

  /**
   * Check for tasks whose deadlines have passed.
   * Creates DEADLINE_EXCEEDED alerts.
   */
  private async checkExceededDeadlines(): Promise<void> {
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        deadline: { lt: now },
        status: { not: 'COMPLETED' },
      },
      include: {
        assignedUsers: {
          include: {
            user: { select: { id: true, firstName: true, email: true, emailNotifications: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of tasks) {
      for (const assignment of task.assignedUsers) {
        if (!assignment.user) continue;

        // Check if alert already sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            type: 'DEADLINE_EXCEEDED',
            receiverId: assignment.user.id,
            taskId: task.id,
            createdAt: { gte: today },
          },
        });

        if (existingAlert) continue;

        // Create in-app alert
        await this.prisma.alert.create({
          data: {
            type: 'DEADLINE_EXCEEDED',
            title: 'חריגה מדדליין',
            message: `המשימה "${task.title}" חרגה מהדדליין (${task.deadline!.toLocaleDateString('he-IL')})`,
            receiverId: assignment.user.id,
            taskId: task.id,
            projectId: task.project?.id,
          },
        });

        // Send email
        if (assignment.user.emailNotifications) {
          await this.emailService.sendDeadlineAlertEmail(
            assignment.user.email,
            task.title,
            task.deadline!,
            assignment.user.firstName,
            true
          );
        }
      }
    }
  }
}
