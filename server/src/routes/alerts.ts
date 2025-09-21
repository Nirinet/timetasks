import express from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user alerts
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { unread } = req.query;
    
    const alerts = await prisma.alert.findMany({
      where: {
        receiverId: req.user!.id,
        ...(unread === 'true' && { isRead: false })
      },
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    next(error);
  }
});

// Mark alert as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await prisma.alert.update({
      where: {
        id: req.params.id,
        receiverId: req.user!.id
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      message: 'התראה סומנה כנקראה'
    });
  } catch (error) {
    next(error);
  }
});

// Mark all alerts as read
router.put('/mark-all-read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await prisma.alert.updateMany({
      where: {
        receiverId: req.user!.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      message: 'כל ההתראות סומנו כנקראות'
    });
  } catch (error) {
    next(error);
  }
});

export default router;