import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// MIME type validation map - extension must match actual content type
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'pdf': ['application/pdf'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xls': ['application/vnd.ms-excel'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'txt': ['text/plain'],
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt').split(',');
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);

    if (!allowedTypes.includes(fileExt)) {
      return cb(new Error(`סוג קובץ לא מותר: ${fileExt}`));
    }

    // Validate MIME type matches extension
    const expectedMimes = ALLOWED_MIME_TYPES[fileExt];
    if (expectedMimes && !expectedMimes.includes(file.mimetype)) {
      logger.warn('MIME type mismatch on upload', { fileExt, mimetype: file.mimetype, originalname: file.originalname });
      return cb(new Error(`סוג קובץ לא תואם: ${fileExt} עם ${file.mimetype}`));
    }

    cb(null, true);
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'לא נבחר קובץ'
      });
    }

    const { taskId, commentId } = req.body;

    if (!taskId && !commentId) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מזהה משימה או תגובה'
      });
    }

    const fileAttachment = await prisma.fileAttachment.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.filename, // Store only filename, not absolute path (portable across environments)
        uploadedById: req.user!.id,
        ...(taskId && { taskId }),
        ...(commentId && { commentId })
      },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'קובץ הועלה בהצלחה',
      data: { file: fileAttachment }
    });
  } catch (error) {
    next(error);
  }
});

// Download file (with authorization check)
router.get('/download/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: req.params.id },
      include: {
        task: {
          select: {
            projectId: true,
            assignedUsers: {
              select: { userId: true, clientId: true }
            }
          }
        },
        comment: {
          select: {
            taskId: true,
            projectId: true,
            task: {
              select: {
                assignedUsers: {
                  select: { userId: true, clientId: true }
                }
              }
            }
          }
        }
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'קובץ לא נמצא'
      });
    }

    // Authorization check for CLIENT users
    if (req.user!.role === 'CLIENT') {
      const assignedUsers = file.task?.assignedUsers || file.comment?.task?.assignedUsers || [];
      const hasAccess = assignedUsers.some(au => au.clientId === req.user!.id);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה להוריד קובץ זה'
        });
      }
    }

    // Reconstruct full path from stored filename with path traversal protection
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const fullPath = path.resolve(resolvedUploadDir, path.basename(file.path));

    if (!fullPath.startsWith(resolvedUploadDir)) {
      return res.status(403).json({
        success: false,
        message: 'נתיב קובץ לא חוקי'
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'קובץ לא נמצא במערכת'
      });
    }

    res.download(fullPath, file.originalName);
  } catch (error) {
    next(error);
  }
});

export default router;