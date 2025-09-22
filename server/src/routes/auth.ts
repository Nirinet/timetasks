import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { loginRateLimiter, resetLoginAttempts } from '../middleware/loginRateLimiter';
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

// Generate JWT tokens
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

// Login with rate limiting
router.post('/login', loginRateLimiter, async (req, res, next) => {
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
        phone: true,
        emailNotifications: true,
        timerAlerts: true,
        language: true
      }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'כתובת דוא"ל או סיסמה שגויים'
      });
    }

    if (!user.isActive) {
      logger.warn('Login attempt on inactive account', { email, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'החשבון אינו פעיל. פנה למנהל המערכת'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Failed login attempt', { email, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'כתובת דוא"ל או סיסמה שגויים'
      });
    }

    // Reset login attempts on successful login
    resetLoginAttempts(req.ip, email);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email, 
      ip: req.ip 
    });

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register (Admin only for production, open for first user)
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

    // Check if any users exist
    const userCount = await prisma.user.count();
    
    // If users exist, require admin authentication
    if (userCount > 0) {
      // Apply authentication middleware
      const authMiddleware = authenticateToken as any;
      await new Promise((resolve, reject) => {
        authMiddleware(req, res, (err: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });

      // Check if user is admin
      const authReq = req as AuthRequest;
      if (!authReq.user || authReq.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'רק מנהל מערכת יכול ליצור משתמשים חדשים'
        });
      }
    }

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

    // First user is admin, rest are employees by default
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
        phone: true,
        joinDate: true
      }
    });

    logger.info('New user registered', { 
      userId: user.id,
      email: user.email,
      role,
      registeredBy: userCount > 0 ? (req as AuthRequest).user?.id : 'system'
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

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
    } catch (err) {
      logger.warn('Invalid refresh token attempt', { ip: req.ip });
      return res.status(403).json({
        success: false,
        message: 'אסימון רענון לא תקין'
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true, email: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'משתמש לא קיים או לא פעיל'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    logger.info('Tokens refreshed', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    next(error);
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
        lastLogin: true,
        emailNotifications: true,
        timerAlerts: true,
        language: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

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

    logger.info('Profile updated', { userId: user.id, email: user.email });

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

    // Check if same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית'
      });
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true, email: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      logger.warn('Failed password change attempt - wrong current password', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
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

    logger.info('Password changed successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'סיסמה שונתה בהצלחה'
    });
  } catch (error) {
    next(error);
  }
});

// Logout (mainly for logging purposes)
router.post('/logout', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    logger.info('User logged out', { 
      userId: req.user!.id, 
      email: req.user!.email,
      ip: req.ip 
    });

    res.json({
      success: true,
      message: 'התנתקות בוצעה בהצלחה'
    });
  } catch (error) {
    next(error);
  }
});

// Verify token (for client-side validation)
router.get('/verify', authenticateToken, async (req: AuthRequest, res, next) => {
  res.json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  });
});

export default router;