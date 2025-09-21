import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
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

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar').split(',');
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`סוג קובץ לא מותר: ${fileExt}`));
    }
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
        path: req.file.path,
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

// Download file
router.get('/download/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: req.params.id }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'קובץ לא נמצא'
      });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        message: 'קובץ לא נמצא במערכת'
      });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    next(error);
  }
});

export default router;