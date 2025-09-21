import express from 'express';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Create comment
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      content: Joi.string().min(1).required(),
      taskId: Joi.string().uuid().optional(),
      projectId: Joi.string().uuid().optional()
    }).xor('taskId', 'projectId');

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const comment = await prisma.comment.create({
      data: {
        ...req.body,
        authorId: req.user!.id
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'תגובה נוספה בהצלחה',
      data: { comment }
    });
  } catch (error) {
    next(error);
  }
});

// Get comments for task/project
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { taskId, projectId } = req.query;

    if (!taskId && !projectId) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מזהה משימה או פרויקט'
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        ...(taskId && { taskId: taskId as string }),
        ...(projectId && { projectId: projectId as string })
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
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
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    next(error);
  }
});

export default router;