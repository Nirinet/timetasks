import express from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { applyClientTaskFilter } from '../utils/querySelects';

const router = express.Router();

// Global search
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { tasks: [], projects: [], clients: [] }
      });
    }

    const isClient = req.user!.role === 'CLIENT';

    // Search tasks
    let taskWhere: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    };
    if (isClient) {
      taskWhere.assignedUsers = { some: { clientId: req.user!.id } };
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        status: true,
        project: { select: { name: true } }
      },
      take: 10,
      orderBy: { creationDate: 'desc' }
    });

    // Search projects
    let projectWhere: any = {
      name: { contains: q, mode: 'insensitive' }
    };
    if (isClient) {
      projectWhere.tasks = {
        some: { assignedUsers: { some: { clientId: req.user!.id } } }
      };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        status: true,
        client: { select: { name: true } }
      },
      take: 5,
      orderBy: { startDate: 'desc' }
    });

    // Search clients (not for CLIENT users)
    let clients: any[] = [];
    if (!isClient) {
      clients = await prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { contactPerson: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          contactPerson: true
        },
        take: 5
      });
    }

    res.json({
      success: true,
      data: { tasks, projects, clients }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
