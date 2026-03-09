import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.systemSettings.findMany();

    // Convert to key-value object
    const settingsObj: Record<string, string> = {};
    for (const s of settings) {
      settingsObj[s.key] = s.value;
    }

    res.json({
      success: true,
      data: { settings: settingsObj }
    });
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const updates = req.body as Record<string, string>;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, message: 'נדרש אובייקט הגדרות' });
    }

    // Allowed setting keys
    const allowedKeys = ['timer_alert_minutes', 'deadline_alert_hours', 'system_name'];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;

      await prisma.systemSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    logger.info('System settings updated', { userId: req.user!.id, keys: Object.keys(updates) });

    // Return updated settings
    const settings = await prisma.systemSettings.findMany();
    const settingsObj: Record<string, string> = {};
    for (const s of settings) {
      settingsObj[s.key] = s.value;
    }

    res.json({
      success: true,
      message: 'ההגדרות עודכנו בהצלחה',
      data: { settings: settingsObj }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
