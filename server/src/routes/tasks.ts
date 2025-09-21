import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TaskStatus, Priority } from '@prisma/client';

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
        assignedUsers: {
          create: [
            ...assignedUserIds.map((userId: string) => ({ userId })),
            ...assignedClientIds.map((clientId: string) => ({ clientId }))
          ]
        }
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