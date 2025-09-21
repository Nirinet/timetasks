import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'כתובת דוא"ל לא תקינה',
    'any.required': 'כתובת דוא"ל נדרשת'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'סיסמה חייבת להכיל לפחות 6 תווים',
    'any.required': 'סיסמה נדרשת'
  })
});

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'כתובת דוא"ל לא תקינה',
    'any.required': 'כתובת דוא"ל נדרשת'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required().messages({
    'string.min': 'סיסמה חייבת להכיל לפחות 8 תווים',
    'string.pattern.base': 'סיסמה חייבת להכיל אות קטנה, אות גדולה ומספר',
    'any.required': 'סיסמה נדרשת'
  }),
  firstName: Joi.string().min(2).required().messages({
    'string.min': 'שם פרטי חייב להכיל לפחות 2 תווים',
    'any.required': 'שם פרטי נדרש'
  }),
  lastName: Joi.string().min(2).required().messages({
    'string.min': 'שם משפחה חייב להכיל לפחות 2 תווים',
    'any.required': 'שם משפחה נדרש'
  }),
  phone: Joi.string().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'סיסמה נוכחית נדרשת'
  }),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required().messages({
    'string.min': 'סיסמה חדשה חייבת להכיל לפחות 8 תווים',
    'string.pattern.base': 'סיסמה חדשה חייבת להכיל אות קטנה, אות גדולה ומספר',
    'any.required': 'סיסמה חדשה נדרשת'
  })
});

// Generate JWT token
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'כתובת דוא"ל או סיסמה שגויים'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'כתובת דוא"ל או סיסמה שגויים'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register (Admin only - for creating initial users)
router.post('/register', async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
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

    // Create user (first user is admin, rest are employees by default)
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'EMPLOYEE';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true
      }
    });

    logger.info(`New user registered: ${user.email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'משתמש נוצר בהצלחה',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'אסימון רענון חסר'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as any;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'משתמש לא קיים או לא פעיל'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'אסימון רענון לא תקין'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        joinDate: true,
        emailNotifications: true,
        timerAlerts: true,
        language: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateSchema = Joi.object({
      firstName: Joi.string().min(2).optional(),
      lastName: Joi.string().min(2).optional(),
      phone: Joi.string().optional().allow('', null),
      emailNotifications: Joi.boolean().optional(),
      timerAlerts: Joi.boolean().optional(),
      language: Joi.string().valid('he', 'en').optional()
    });

    const { error } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailNotifications: true,
        timerAlerts: true,
        language: true
      }
    });

    res.json({
      success: true,
      message: 'פרופיל עודכן בהצלחה',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user!.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'סיסמה נוכחית שגויה'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword }
    });

    logger.info(`Password changed for user: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'סיסמה שונתה בהצלחה'
    });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    logger.info(`User logged out: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'התנתקות בוצעה בהצלחה'
    });
  } catch (error) {
    next(error);
  }
});

export default router;