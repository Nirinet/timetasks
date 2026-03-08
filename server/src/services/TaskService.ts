import { PrismaClient, TaskStatus, ProjectStatus } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Service layer for task-related business logic.
 * Extracted from routes/tasks.ts for better separation of concerns.
 */
export class TaskService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Automatically update task and project statuses based on subtask completion.
   * When all subtasks are complete, parent task auto-completes.
   * When all project tasks are complete, project auto-completes.
   * Uses visited set to prevent infinite recursion in hierarchies.
   */
  async handleAutomation(taskId: string, visited: Set<string> = new Set()): Promise<void> {
    if (visited.has(taskId)) {
      return;
    }

    visited.add(taskId);

    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          status: true,
          parentTaskId: true,
          projectId: true
        }
      });

      if (!task) {
        return;
      }

      // Check subtask completion status
      const [subtaskCount, incompleteSubtasks] = await Promise.all([
        this.prisma.task.count({ where: { parentTaskId: task.id } }),
        this.prisma.task.count({
          where: {
            parentTaskId: task.id,
            status: { not: TaskStatus.COMPLETED }
          }
        })
      ]);

      if (subtaskCount > 0) {
        if (incompleteSubtasks === 0 && task.status !== TaskStatus.COMPLETED) {
          await this.prisma.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.COMPLETED }
          });
          task.status = TaskStatus.COMPLETED;
        } else if (incompleteSubtasks > 0 && task.status === TaskStatus.COMPLETED) {
          await this.prisma.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.IN_PROGRESS }
          });
          task.status = TaskStatus.IN_PROGRESS;
        }
      }

      // Handle parent and project status updates in parallel where possible
      const parentPromise = task.parentTaskId
        ? (async () => {
            const incompleteSiblings = await this.prisma.task.count({
              where: {
                parentTaskId: task.parentTaskId!,
                status: { not: TaskStatus.COMPLETED }
              }
            });

            if (incompleteSiblings === 0) {
              await this.prisma.task.update({
                where: { id: task.parentTaskId! },
                data: { status: TaskStatus.COMPLETED }
              });
            } else {
              await this.prisma.task.updateMany({
                where: {
                  id: task.parentTaskId!,
                  status: TaskStatus.COMPLETED
                },
                data: { status: TaskStatus.IN_PROGRESS }
              });
            }

            await this.handleAutomation(task.parentTaskId!, visited);
          })()
        : Promise.resolve();

      const projectPromise = (async () => {
        const incompleteProjectTasks = await this.prisma.task.count({
          where: {
            projectId: task.projectId,
            status: { not: TaskStatus.COMPLETED }
          }
        });

        if (incompleteProjectTasks === 0) {
          await this.prisma.project.update({
            where: { id: task.projectId },
            data: { status: ProjectStatus.COMPLETED }
          });
        } else {
          await this.prisma.project.updateMany({
            where: {
              id: task.projectId,
              status: ProjectStatus.COMPLETED
            },
            data: { status: ProjectStatus.ACTIVE }
          });
        }
      })();

      await Promise.all([parentPromise, projectPromise]);
    } catch (error) {
      logger.error('Task automation failed', { taskId, error });
    }
  }

  /**
   * Verify that a user (by role) has access to a specific project.
   * ADMIN and EMPLOYEE have access to all projects.
   * CLIENT users only have access if they have assigned tasks in the project.
   */
  async verifyProjectAccess(userId: string, projectId: string, role: string): Promise<boolean> {
    try {
      if (role === 'ADMIN' || role === 'EMPLOYEE') {
        return true;
      }

      const access = await this.prisma.taskAssignment.findFirst({
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
}
