import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Prisma errors - use proper error codes instead of string matching
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'נתונים כפולים - הרשומה כבר קיימת במערכת';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'הרשומה לא נמצאה';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'נתונים לא תקינים - קיימת תלות בנתונים אחרים';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'הפעולה מפרה אילוץ בבסיס הנתונים';
        break;
      default:
        statusCode = 500;
        message = 'שגיאה בבסיס הנתונים';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'נתונים לא תקינים';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'אסימון גישה לא תקין';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'אסימון הגישה פג תוקף';
  }

  // Validation errors (Joi)
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'נתונים לא תקינים';
  }

  // Multer file upload errors
  if (error.name === 'MulterError') {
    statusCode = 400;
    if (error.message === 'File too large') {
      message = 'הקובץ גדול מדי';
    } else {
      message = 'שגיאה בהעלאת הקובץ';
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      errorCode: (error as any).code
    })
  });
};
