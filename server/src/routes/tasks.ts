import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TaskStatus, ProjectStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const router = express.Router();

// Get tasks with filtering
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    
    let whereClause: any = {};

    // Filter for client users
    if (req.user!.role === 'CLIENT') {
      whereClause.assignedUsers = {
        some: {
          clientId: req.user!.id
        }
      };
    }

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
      include: {
        project: {
          select: {
            name: true,
            client: {
              select: { name: true }
            }
          }
        },
        assignedUsers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
            timeRecords: true
          }
        }
      },
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
      title: Joi.string().min(2).required(),
      description: Joi.string().optional(),
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

    // Check permissions
    if (req.user!.role === 'CLIENT') {
      // Clients can only create tasks in projects they're assigned to
      const hasAccess = await prisma.taskAssignment.findFirst({
        where: {
          clientId: req.user!.id,
          task: {
            projectId: taskData.projectId
          }
        }
      });

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
      include: {
        project: {
          select: { name: true }
        },
        assignedUsers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    await handleTaskAutomation(task.id);

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

    if (req.user!.role === 'CLIENT') {
      whereClause.assignedUsers = {
        some: {
          clientId: req.user!.id
        }
      };
    }

    const task = await prisma.task.findFirst({
      where: whereClause,
      include: {
        project: {
          select: {
            name: true,
            client: {
              select: { name: true }
            }
          }
        },
        assignedUsers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            },
            client: {
              select: {
                name: true
              }
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
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { startTime: 'desc' }
        },
        comments: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            },
            files: true
          },
          orderBy: { createdAt: 'desc' }
        },
        files: {
          include: {
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true
              }
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
      title: Joi.string().min(2).optional(),
      description: Joi.string().optional(),
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
    if (req.user!.role === 'CLIENT') {
      whereClause.assignedUsers = {
        some: {
          clientId: req.user!.id
        }
      };
    }

    const existingTask = await prisma.task.findFirst({ where: whereClause });
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה או אין הרשאה לעדכן אותה'
      });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        project: {
          select: { name: true }
        },
        assignedUsers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    await handleTaskAutomation(task.id);

    res.json({
      success: true,
      message: 'משימה עודכנה בהצלחה',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

async function handleTaskAutomation(taskId: string, visited: Set<string> = new Set()): Promise<void> {
  if (visited.has(taskId)) {
    return;
  }

  visited.add(taskId);

  try {
    const task = await prisma.task.findUnique({
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

    const [subtaskCount, incompleteSubtasks] = await Promise.all([
      prisma.task.count({ where: { parentTaskId: task.id } }),
      prisma.task.count({
        where: {
          parentTaskId: task.id,
          status: { not: TaskStatus.COMPLETED }
        }
      })
    ]);

    if (subtaskCount > 0) {
      if (incompleteSubtasks === 0 && task.status !== TaskStatus.COMPLETED) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.COMPLETED }
        });
        task.status = TaskStatus.COMPLETED;
      } else if (incompleteSubtasks > 0 && task.status === TaskStatus.COMPLETED) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.IN_PROGRESS }
        });
        task.status = TaskStatus.IN_PROGRESS;
      }
    }

    if (task.parentTaskId) {
      const incompleteSiblings = await prisma.task.count({
        where: {
          parentTaskId: task.parentTaskId,
          status: { not: TaskStatus.COMPLETED }
        }
      });

      if (incompleteSiblings === 0) {
        await prisma.task.update({
          where: { id: task.parentTaskId },
          data: { status: TaskStatus.COMPLETED }
        });
      } else {
        await prisma.task.updateMany({
          where: {
            id: task.parentTaskId,
            status: TaskStatus.COMPLETED
          },
          data: { status: TaskStatus.IN_PROGRESS }
        });
      }

      await handleTaskAutomation(task.parentTaskId, visited);
    }

    const incompleteProjectTasks = await prisma.task.count({
      where: {
        projectId: task.projectId,
        status: { not: TaskStatus.COMPLETED }
      }
    });

    if (incompleteProjectTasks === 0) {
      await prisma.project.update({
        where: { id: task.projectId },
        data: { status: ProjectStatus.COMPLETED }
      });
    } else {
      await prisma.project.updateMany({
        where: {
          id: task.projectId,
          status: ProjectStatus.COMPLETED
        },
        data: { status: ProjectStatus.ACTIVE }
      });
    }
  } catch (error) {
    logger.error('Task automation failed', { taskId, error });
  }
}