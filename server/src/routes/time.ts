import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { io } from '../index';

const router = express.Router();

// Helper function to convert client timezone to UTC
const toUTC = (dateString: string, timezone?: string): Date => {
  // If timezone is provided, use it, otherwise assume Israel timezone
  const tz = timezone || 'Asia/Jerusalem';
  const date = new Date(dateString);
  // In production, you'd use a library like date-fns-tz for proper timezone handling
  return date;
};

// Get time records with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      taskId, 
      employeeId, 
      startDate, 
      endDate,
      page = '1',
      limit = '50',
      timezone = 'Asia/Jerusalem'
    } = req.query;
    
    let whereClause: any = {};
    
    // Permission check for non-admin users
    if (req.user!.role === 'EMPLOYEE') {
      whereClause.employeeId = req.user!.id;
    } else if (req.user!.role === 'CLIENT') {
      // Clients can see time records for tasks in their linked Client's projects
      whereClause.task = {
        project: {
          clients: {
            some: {
              clientId: req.user!.clientEntityId ?? '__no_access__'
            }
          }
        }
      };
    }
    
    if (taskId) whereClause.taskId = taskId;
    if (employeeId && req.user!.role === 'ADMIN') {
      whereClause.employeeId = employeeId;
    }
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = toUTC(startDate as string, timezone as string);
      if (endDate) whereClause.date.lte = toUTC(endDate as string, timezone as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 records
    const skip = (pageNum - 1) * limitNum;

    const [timeRecords, total] = await Promise.all([
      prisma.timeRecord.findMany({
        where: whereClause,
        include: {
          task: {
            select: {
              title: true,
              project: {
                select: {
                  name: true,
                  client: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.timeRecord.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: { 
        timeRecords,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Start timer with validation and broadcasting
router.post('/start', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      taskId: Joi.string().uuid().required(),
      description: Joi.string().max(500).optional(),
      timezone: Joi.string().optional().default('Asia/Jerusalem')
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { taskId, description, timezone } = req.body;

    // Check if task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        assignedUsers: {
          some: {
            userId: req.user!.id
          }
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
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

    // Check for existing active timers (allow multiple timers per user)
    const activeTimersCount = await prisma.timeRecord.count({
      where: {
        employeeId: req.user!.id,
        status: 'ACTIVE'
      }
    });

    if (activeTimersCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'ניתן להפעיל עד 3 טיימרים במקביל'
      });
    }

    // Check if there's already an active timer for this specific task
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
        startTime: new Date(), // Server time, will be converted on display
        description,
        status: 'ACTIVE'
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Broadcast to project members via Socket.IO
    io.to(`project_${task.project.id}`).emit('timer_started', {
      timerId: timeRecord.id,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project.id,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      startTime: timeRecord.startTime
    });

    // Log activity
    logger.info('Timer started', {
      userId: req.user!.id,
      taskId,
      timerId: timeRecord.id
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

// Stop timer with validation
router.post('/stop/:id', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      description: Joi.string().max(500).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const timeRecord = await prisma.timeRecord.findFirst({
      where: {
        id: req.params.id,
        employeeId: req.user!.id,
        status: 'ACTIVE'
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
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

    // Minimum duration check
    if (duration < 1) {
      return res.status(400).json({
        success: false,
        message: 'משך זמן מינימלי הוא דקה אחת'
      });
    }

    const updatedRecord = await prisma.timeRecord.update({
      where: { id: req.params.id },
      data: {
        endTime,
        duration,
        status: 'COMPLETED',
        ...(req.body.description && { description: req.body.description })
      },
      include: {
        task: {
          select: {
            title: true,
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Broadcast to project members
    io.to(`project_${timeRecord.task.project.id}`).emit('timer_stopped', {
      timerId: updatedRecord.id,
      taskId: timeRecord.task.id,
      taskTitle: timeRecord.task.title,
      projectId: timeRecord.task.project.id,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      duration: updatedRecord.duration
    });

    // Log activity
    logger.info('Timer stopped', {
      userId: req.user!.id,
      taskId: timeRecord.task.id,
      timerId: updatedRecord.id,
      duration: updatedRecord.duration
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
            id: true,
            title: true,
            priority: true,
            project: {
              select: {
                id: true,
                name: true,
                client: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Calculate running duration for each timer
    const timersWithDuration = activeTimers.map(timer => ({
      ...timer,
      runningDuration: Math.round((Date.now() - timer.startTime.getTime()) / (1000 * 60)) // minutes
    }));

    res.json({
      success: true,
      data: { activeTimers: timersWithDuration }
    });
  } catch (error) {
    next(error);
  }
});

// Manual time entry with validation
router.post('/manual', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      taskId: Joi.string().uuid().required(),
      date: Joi.date().max('now').required(),
      startTime: Joi.date().required(),
      endTime: Joi.date().required(),
      description: Joi.string().max(500).optional(),
      timezone: Joi.string().optional().default('Asia/Jerusalem')
    }).custom((value, helpers) => {
      if (new Date(value.endTime) <= new Date(value.startTime)) {
        return helpers.error('any.invalid', { message: 'שעת סיום חייבת להיות אחרי שעת התחלה' });
      }
      return value;
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { taskId, date, startTime, endTime, description, timezone } = req.body;

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

    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));

    // Check for reasonable duration (max 12 hours)
    if (duration > 720) {
      return res.status(400).json({
        success: false,
        message: 'משך זמן מקסימלי הוא 12 שעות'
      });
    }

    // Check for overlapping time records
    const overlapping = await prisma.timeRecord.findFirst({
      where: {
        employeeId: req.user!.id,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gte: new Date(startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lte: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'קיים רישום זמן חופף בטווח השעות שנבחר'
      });
    }

    const timeRecord = await prisma.timeRecord.create({
      data: {
        taskId,
        employeeId: req.user!.id,
        date: toUTC(date, timezone),
        startTime: toUTC(startTime, timezone),
        endTime: toUTC(endTime, timezone),
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

    // Log manual entry
    logger.info('Manual time entry created', {
      userId: req.user!.id,
      taskId,
      duration,
      date
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

// Delete time record (admin only or own records)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const timeRecord = await prisma.timeRecord.findUnique({
      where: { id: req.params.id }
    });

    if (!timeRecord) {
      return res.status(404).json({
        success: false,
        message: 'רישום זמן לא נמצא'
      });
    }

    // Check permissions
    if (req.user!.role !== 'ADMIN' && timeRecord.employeeId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה למחוק רישום זמן זה'
      });
    }

    await prisma.timeRecord.delete({
      where: { id: req.params.id }
    });

    logger.info('Time record deleted', {
      userId: req.user!.id,
      timeRecordId: req.params.id
    });

    res.json({
      success: true,
      message: 'רישום זמן נמחק בהצלחה'
    });
  } catch (error) {
    next(error);
  }
});

export default router;