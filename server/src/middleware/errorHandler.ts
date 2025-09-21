import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError,
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

  // Prisma errors
  if (error.message?.includes('P2002')) {
    statusCode = 409;
    message = 'נתונים כפולים - הרשומה כבר קיימת במערכת';
  } else if (error.message?.includes('P2025')) {
    statusCode = 404;
    message = 'הרשומה לא נמצאה';
  } else if (error.message?.includes('P2003')) {
    statusCode = 400;
    message = 'נתונים לא תקינים - קיימת תלות בנתונים אחרים';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'אסימון גישה לא תקין';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'אסימון הגישה פג תוקף';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'נתונים לא תקינים';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error
    })
  });
};