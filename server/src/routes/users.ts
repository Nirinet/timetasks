import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        joinDate: true,
        lastLogin: true,
        phone: true
      },
      orderBy: { joinDate: 'desc' }
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
});

// Create user (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(2).required(),
      lastName: Joi.string().min(2).required(),
      phone: Joi.string().optional(),
      role: Joi.string().valid('ADMIN', 'EMPLOYEE', 'CLIENT').required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'משתמש עם כתובת דוא"ל זו כבר קיים'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role as UserRole
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        joinDate: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'משתמש נוצר בהצלחה',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const schema = Joi.object({
      firstName: Joi.string().min(2).optional(),
      lastName: Joi.string().min(2).optional(),
      phone: Joi.string().optional().allow('', null),
      role: Joi.string().valid('ADMIN', 'EMPLOYEE', 'CLIENT').optional(),
      isActive: Joi.boolean().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'משתמש עודכן בהצלחה',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Delete (deactivate) user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'משתמש לא נמצא' });
    }

    // Prevent self-deletion
    if (user.id === req.user!.id) {
      return res.status(400).json({ success: false, message: 'לא ניתן למחוק את המשתמש שלך' });
    }

    // Soft delete - deactivate instead of hard delete to preserve FK references
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    logger.info('User deactivated', { userId: req.user!.id, targetUserId: req.params.id });
    res.json({ success: true, message: 'המשתמש הושבת בהצלחה' });
  } catch (error) {
    next(error);
  }
});

export default router;