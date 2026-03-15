import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all clients
router.get('/', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: { joinDate: 'desc' }
    });

    res.json({
      success: true,
      data: { clients }
    });
  } catch (error) {
    next(error);
  }
});

// Create client
router.post('/', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      contactPerson: Joi.string().min(2).required(),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      address: Joi.string().optional(),
      notes: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const client = await prisma.client.create({
      data: {
        ...req.body,
        createdById: req.user!.id
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'לקוח נוצר בהצלחה',
      data: { client }
    });
  } catch (error) {
    next(error);
  }
});

// Get client by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                targetDate: true
              }
            }
          },
          orderBy: { assignedAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'לקוח לא נמצא'
      });
    }

    // Check permissions for client users — only their linked Client entity
    if (req.user!.role === 'CLIENT') {
      if (req.user!.clientEntityId !== client.id) {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה לצפות בלקוח זה'
        });
      }
    }

    res.json({
      success: true,
      data: { client }
    });
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).optional(),
      contactPerson: Joi.string().min(2).optional(),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      address: Joi.string().optional(),
      notes: Joi.string().optional(),
      isActive: Joi.boolean().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'לקוח עודכן בהצלחה',
      data: { client }
    });
  } catch (error) {
    next(error);
  }
});

// Delete client
router.delete('/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { projects: true } } }
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'לקוח לא נמצא' });
    }

    if (client._count.projects > 0) {
      return res.status(400).json({
        success: false,
        message: 'לא ניתן למחוק לקוח עם פרויקטים. יש למחוק את הפרויקטים קודם או להפוך אותו ללא פעיל'
      });
    }

    await prisma.taskAssignment.deleteMany({ where: { clientId: client.id } });
    await prisma.projectClient.deleteMany({ where: { clientId: client.id } });
    await prisma.client.delete({ where: { id: req.params.id } });

    logger.info('Client deleted', { userId: req.user!.id, clientId: req.params.id });
    res.json({ success: true, message: 'הלקוח נמחק בהצלחה' });
  } catch (error) {
    next(error);
  }
});

export default router;