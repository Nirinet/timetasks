import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';
import { TaskService } from '../services/TaskService';
import { AlertService } from '../services/AlertService';
import { logger } from '../utils/logger';
import {
  TASK_INCLUDE_LIST,
  TASK_INCLUDE_MUTATION,
  USER_SELECT_BASIC,
  USER_SELECT_WITH_ROLE,
  COMMENT_INCLUDE_WITH_FILES,
  applyClientTaskFilter
} from '../utils/querySelects';

const router = express.Router();
const taskService = new TaskService(prisma);
const alertService = new AlertService(prisma);

// Get tasks with filtering
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;

    let whereClause: any = {};

    // Apply client filter
    applyClientTaskFilter(whereClause, req.user!.clientEntityId, req.user!.role);

    if (projectId) whereClause.projectId = projectId;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedTo) {
      whereClause.assignedUsers = {
        some: {
          userId: assignedTo
        }
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: TASK_INCLUDE_LIST,
      orderBy: {
        creationDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().min(2).max(500).required(),
      description: Joi.string().max(50000).optional(),
      projectId: Joi.string().uuid().required(),
      priority: Joi.string().valid('URGENT_IMPORTANT', 'IMPORTANT', 'NORMAL', 'LOW').default('NORMAL'),
      deadline: Joi.date().optional(),
      timeEstimate: Joi.number().positive().optional(),
      parentTaskId: Joi.string().uuid().optional(),
      assignedUserIds: Joi.array().items(Joi.string().uuid()).optional(),
      assignedClientIds: Joi.array().items(Joi.string().uuid()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { assignedUserIds = [], assignedClientIds = [], ...taskData } = req.body;

    // Check permissions - clients can only create tasks in projects of their linked Client entity
    if (req.user!.role === 'CLIENT') {
      const hasAccess = await taskService.verifyProjectAccess(req.user!.clientEntityId, taskData.projectId, req.user!.role);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה ליצור משימה בפרויקט זה'
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        ...taskData,
        assignedUsers:
          assignedUserIds.length > 0 || assignedClientIds.length > 0
            ? {
                create: [
                  ...assignedUserIds.map((userId: string) => ({
                    userId,
                    assignedBy: req.user!.id
                  })),
                  ...assignedClientIds.map((clientId: string) => ({
                    clientId,
                    assignedBy: req.user!.id
                  }))
                ]
              }
            : undefined
      },
      include: TASK_INCLUDE_MUTATION
    });

    await taskService.handleAutomation(task.id);

    // Record creation in history
    await taskService.recordChanges(task.id, req.user!.id, 'CREATE', null, { title: task.title });

    res.status(201).json({
      success: true,
      message: 'משימה נוצרה בהצלחה',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = { id: req.params.id };

    applyClientTaskFilter(whereClause, req.user!.clientEntityId, req.user!.role);

    const task = await prisma.task.findFirst({
      where: whereClause,
      include: {
        project: {
          select: {
            name: true,
            clients: {
              include: {
                client: {
                  select: { name: true }
                }
              }
            }
          }
        },
        assignedUsers: {
          include: {
            user: {
              select: USER_SELECT_WITH_ROLE
            },
            client: {
              select: { name: true }
            }
          }
        },
        subtasks: {
          include: {
            _count: {
              select: {
                subtasks: true
              }
            }
          }
        },
        parentTask: {
          select: {
            title: true
          }
        },
        timeRecords: {
          include: {
            employee: {
              select: USER_SELECT_BASIC
            }
          },
          orderBy: { startTime: 'desc' }
        },
        comments: {
          include: COMMENT_INCLUDE_WITH_FILES,
          orderBy: { createdAt: 'desc' }
        },
        files: {
          include: {
            uploadedBy: {
              select: USER_SELECT_BASIC
            }
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה או אין הרשאה לצפות בה'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().min(2).max(500).optional(),
      description: Joi.string().max(50000).optional(),
      priority: Joi.string().valid('URGENT_IMPORTANT', 'IMPORTANT', 'NORMAL', 'LOW').optional(),
      status: Joi.string().valid('NEW', 'IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED').optional(),
      deadline: Joi.date().optional(),
      timeEstimate: Joi.number().positive().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Get current task to check permissions
    let whereClause: any = { id: req.params.id };
    applyClientTaskFilter(whereClause, req.user!.clientEntityId, req.user!.role);

    const existingTask = await prisma.task.findFirst({ where: whereClause });
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה או אין הרשאה לעדכן אותה'
      });
    }

    // CLIENT users can edit priority freely, and status only if no time records
    if (req.user!.role === 'CLIENT') {
      const allowedFields = ['status', 'priority'];
      const requestedFields = Object.keys(req.body);

      const hasDisallowedFields = requestedFields.some(f => !allowedFields.includes(f));
      if (hasDisallowedFields) {
        return res.status(403).json({
          success: false,
          message: 'לקוח יכול לעדכן עדיפות וסטטוס בלבד'
        });
      }

      // Status changes only allowed if task has no time records (work not started)
      if (req.body.status) {
        const timeRecordCount = await prisma.timeRecord.count({
          where: { taskId: req.params.id }
        });
        if (timeRecordCount > 0) {
          return res.status(403).json({
            success: false,
            message: 'לא ניתן לשנות סטטוס משימה שכבר התחילו לעבוד עליה'
          });
        }
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
      include: TASK_INCLUDE_MUTATION
    });

    // Record changes to history
    await taskService.recordChanges(req.params.id, req.user!.id, 'UPDATE', existingTask, req.body);

    // Notify CLIENT users if status changed
    if (req.body.status && req.body.status !== existingTask.status) {
      alertService.notifyClientUsersOnStatusChange(
        req.user!.id,
        task.id,
        existingTask.projectId,
        task.project?.name ? `${task.project.name} - ${task.assignedUsers?.[0]?.user?.firstName || ''}` : existingTask.title || '',
        existingTask.status,
        req.body.status
      ).catch(err => logger.error('Failed to notify clients on status change', err));
    }

    await taskService.handleAutomation(task.id);

    res.json({
      success: true,
      message: 'משימה עודכנה בהצלחה',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = { id: req.params.id };
    applyClientTaskFilter(whereClause, req.user!.clientEntityId, req.user!.role);

    const task = await prisma.task.findFirst({
      where: whereClause,
      select: { id: true, title: true, projectId: true, _count: { select: { timeRecords: true } } }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'משימה לא נמצאה' });
    }

    // CLIENT can only delete tasks with no time records
    if (req.user!.role === 'CLIENT') {
      if (task._count.timeRecords > 0) {
        return res.status(403).json({
          success: false,
          message: 'לא ניתן למחוק משימה שכבר התחילו לעבוד עליה'
        });
      }
    }

    // Recursive delete helper
    const deleteTaskRecursive = async (tx: any, taskId: string) => {
      // Find subtasks
      const subtasks = await tx.task.findMany({
        where: { parentTaskId: taskId },
        select: { id: true }
      });

      // Delete subtasks recursively
      for (const sub of subtasks) {
        await deleteTaskRecursive(tx, sub.id);
      }

      // Delete task's related records
      await tx.taskAssignment.deleteMany({ where: { taskId } });
      await tx.timeRecord.deleteMany({ where: { taskId } });
      await tx.comment.deleteMany({ where: { taskId } });
      await tx.fileAttachment.deleteMany({ where: { taskId } });
      await tx.taskChangeHistory.deleteMany({ where: { taskId } });
      await tx.alert.deleteMany({ where: { taskId } });
      await tx.task.delete({ where: { id: taskId } });
    };

    await prisma.$transaction(async (tx) => {
      await deleteTaskRecursive(tx, task.id);
    });

    logger.info('Task deleted', { userId: req.user!.id, taskId: req.params.id, taskTitle: task.title });
    res.json({ success: true, message: 'המשימה נמחקה בהצלחה' });
  } catch (error) {
    next(error);
  }
});

// Clone task
router.post('/:id/clone', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const original = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignedUsers: true
      }
    });

    if (!original) {
      return res.status(404).json({ success: false, message: 'משימה לא נמצאה' });
    }

    const cloned = await prisma.task.create({
      data: {
        title: `${original.title} (עותק)`,
        description: original.description,
        projectId: original.projectId,
        priority: original.priority,
        status: 'NEW',
        deadline: original.deadline,
        timeEstimate: original.timeEstimate,
        parentTaskId: original.parentTaskId,
        assignedUsers: original.assignedUsers.length > 0 ? {
          create: original.assignedUsers.map(a => ({
            userId: a.userId || undefined,
            clientId: a.clientId || undefined,
            assignedBy: req.user!.id
          }))
        } : undefined
      },
      include: TASK_INCLUDE_MUTATION
    });

    // Record creation in history
    await taskService.recordChanges(cloned.id, req.user!.id, 'CREATE', null, { title: cloned.title });

    logger.info('Task cloned', { userId: req.user!.id, originalId: req.params.id, newId: cloned.id });
    res.status(201).json({
      success: true,
      message: 'המשימה שוכפלה בהצלחה',
      data: { task: cloned }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
