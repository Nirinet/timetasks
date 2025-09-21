import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get time records
router.get('/', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const { taskId, employeeId, startDate, endDate } = req.query;
    
    let whereClause: any = {};
    
    if (taskId) whereClause.taskId = taskId;
    if (employeeId) whereClause.employeeId = employeeId;
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    const timeRecords = await prisma.timeRecord.findMany({
      where: whereClause,
      include: {
        task: {
          select: {
            title: true,
            project: {
              select: {
                name: true
              }
            }
          }
        },
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json({
      success: true,
      data: { timeRecords }
    });
  } catch (error) {
    next(error);
  }
});

// Start timer
router.post('/start', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      taskId: Joi.string().uuid().required(),
      description: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { taskId, description } = req.body;

    // Check if task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        assignedUsers: {
          some: {
            userId: req.user!.id
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה או אין הרשאה לעבוד עליה'
      });
    }

    // Check if there's already an active timer for this task
    const existingTimer = await prisma.timeRecord.findFirst({
      where: {
        taskId,
        employeeId: req.user!.id,
        status: 'ACTIVE'
      }
    });

    if (existingTimer) {
      return res.status(400).json({
        success: false,
        message: 'כבר קיים טיימר פעיל עבור משימה זו'
      });
    }

    const timeRecord = await prisma.timeRecord.create({
      data: {
        taskId,
        employeeId: req.user!.id,
        startTime: new Date(),
        description,
        status: 'ACTIVE'
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
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
      message: 'טיימר הופעל בהצלחה',
      data: { timeRecord }
    });
  } catch (error) {
    next(error);
  }
});

// Stop timer
router.post('/stop/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: {
        id: req.params.id,
        employeeId: req.user!.id,
        status: 'ACTIVE'
      }
    });

    if (!timeRecord) {
      return res.status(404).json({
        success: false,
        message: 'טיימר פעיל לא נמצא'
      });
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - timeRecord.startTime.getTime()) / (1000 * 60)); // minutes

    const updatedRecord = await prisma.timeRecord.update({
      where: { id: req.params.id },
      data: {
        endTime,
        duration,
        status: 'COMPLETED'
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
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
      message: 'טיימר נעצר בהצלחה',
      data: { timeRecord: updatedRecord }
    });
  } catch (error) {
    next(error);
  }
});

// Get active timers for current user
router.get('/active', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const activeTimers = await prisma.timeRecord.findMany({
      where: {
        employeeId: req.user!.id,
        status: 'ACTIVE'
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
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
      data: { activeTimers }
    });
  } catch (error) {
    next(error);
  }
});

// Manual time entry
router.post('/manual', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      taskId: Joi.string().uuid().required(),
      date: Joi.date().required(),
      startTime: Joi.date().required(),
      endTime: Joi.date().required(),
      description: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { taskId, date, startTime, endTime, description } = req.body;

    // Validate times
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'שעת סיום חייבת להיות אחרי שעת התחלה'
      });
    }

    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));

    const timeRecord = await prisma.timeRecord.create({
      data: {
        taskId,
        employeeId: req.user!.id,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        description,
        status: 'COMPLETED'
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
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
      message: 'רישום זמן נוסף בהצלחה',
      data: { timeRecord }
    });
  } catch (error) {
    next(error);
  }
});

export default router;