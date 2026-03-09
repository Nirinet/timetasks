import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdmin, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';
import { ProjectStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  PROJECT_INCLUDE_LIST,
  PROJECT_INCLUDE_MUTATION,
  USER_SELECT_WITH_ROLE,
  applyClientProjectFilter,
  parsePagination,
  paginationResponse
} from '../utils/querySelects';

const router = express.Router();

// Get all projects (with optional pagination)
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = {};

    // Filter for client users - only their projects
    applyClientProjectFilter(whereClause, req.user!.id, req.user!.role);

    // Optional status filter
    if (req.query.status) {
      whereClause.status = req.query.status;
    }

    const { take, skip, page, limit } = parsePagination(req.query, 50);

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: PROJECT_INCLUDE_LIST,
        orderBy: { startDate: 'desc' },
        take,
        skip
      }),
      prisma.project.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: paginationResponse(page, limit, totalCount)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      description: Joi.string().optional(),
      clientId: Joi.string().uuid().required(),
      startDate: Joi.date().optional(),
      targetDate: Joi.date().optional(),
      hoursBudget: Joi.number().positive().optional(),
      isTemplate: Joi.boolean().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: req.body.clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'לקוח לא נמצא'
      });
    }

    const project = await prisma.project.create({
      data: {
        ...req.body,
        createdById: req.user!.id
      },
      include: PROJECT_INCLUDE_MUTATION
    });

    res.status(201).json({
      success: true,
      message: 'פרויקט נוצר בהצלחה',
      data: { project }
    });
  } catch (error) {
    next(error);
  }
});

// Get project by ID with tasks
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = { id: req.params.id };

    // Check permissions for client users
    applyClientProjectFilter(whereClause, req.user!.id, req.user!.role);

    const project = await prisma.project.findFirst({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        tasks: {
          include: {
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
                    name: true,
                    contactPerson: true
                  }
                }
              }
            },
            _count: {
              select: {
                subtasks: true,
                timeRecords: true,
                comments: true
              }
            }
          },
          where: req.user!.role === 'CLIENT' ? {
            assignedUsers: {
              some: {
                clientId: req.user!.id
              }
            }
          } : undefined,
          orderBy: { creationDate: 'desc' }
        },
        comments: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'פרויקט לא נמצא או אין הרשאה לצפות בו'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).optional(),
      description: Joi.string().optional(),
      startDate: Joi.date().optional(),
      targetDate: Joi.date().optional(),
      status: Joi.string().valid('ACTIVE', 'ON_HOLD', 'COMPLETED').optional(),
      hoursBudget: Joi.number().positive().optional(),
      isTemplate: Joi.boolean().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
      include: PROJECT_INCLUDE_MUTATION
    });

    res.json({
      success: true,
      message: 'פרויקט עודכן בהצלחה',
      data: { project }
    });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { tasks: true } } }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'פרויקט לא נמצא' });
    }

    // Only admin can delete a project that has tasks
    if (project._count.tasks > 0 && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'רק מנהל יכול למחוק פרויקט עם משימות'
      });
    }

    // Cascading delete in transaction
    await prisma.$transaction(async (tx) => {
      // Get all task IDs in the project
      const taskIds = (await tx.task.findMany({
        where: { projectId: project.id },
        select: { id: true }
      })).map(t => t.id);

      if (taskIds.length > 0) {
        // Delete task-related records
        await tx.taskAssignment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.timeRecord.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.fileAttachment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.taskChangeHistory.deleteMany({ where: { taskId: { in: taskIds } } });
        // Delete subtasks first (parentTaskId), then all tasks
        await tx.task.deleteMany({ where: { projectId: project.id, parentTaskId: { not: null } } });
        await tx.task.deleteMany({ where: { projectId: project.id } });
      }

      // Delete alerts related to this project
      await tx.alert.deleteMany({ where: { projectId: project.id } });

      // Delete the project
      await tx.project.delete({ where: { id: project.id } });
    });

    logger.info('Project deleted', { userId: req.user!.id, projectId: req.params.id, projectName: project.name });
    res.json({ success: true, message: 'הפרויקט נמחק בהצלחה' });
  } catch (error) {
    next(error);
  }
});

// Create project from template
router.post('/:id/from-template', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      clientId: Joi.string().uuid().required(),
      startDate: Joi.date().optional(),
      targetDate: Joi.date().optional(),
      adjustDates: Joi.boolean().default(true)
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Get template project with tasks
    const template = await prisma.project.findUnique({
      where: { id: req.params.id, isTemplate: true },
      include: {
        tasks: {
          where: { parentTaskId: null },
          include: {
            subtasks: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'תבנית פרויקט לא נמצאה'
      });
    }

    // Create new project from template
    const newProject = await prisma.project.create({
      data: {
        name: req.body.name,
        description: template.description,
        clientId: req.body.clientId,
        startDate: req.body.startDate || new Date(),
        targetDate: req.body.targetDate,
        hoursBudget: template.hoursBudget,
        createdById: req.user!.id
      }
    });

    // TODO: Create tasks from template (complex logic for task hierarchy)

    res.status(201).json({
      success: true,
      message: 'פרויקט נוצר מתבנית בהצלחה',
      data: { project: newProject }
    });
  } catch (error) {
    next(error);
  }
});

export default router;