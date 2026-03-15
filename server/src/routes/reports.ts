import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper to parse pagination params
function parsePagination(query: any): { take: number; skip: number; page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  return { take: limit, skip: (page - 1) * limit, page, limit };
}

// Hours summary report
router.get('/hours', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, employeeId, projectId } = req.query;
    const { take, skip, page, limit } = parsePagination(req.query);

    let whereClause: any = {
      status: 'COMPLETED'
    };

    // CLIENT: filter to tasks in their linked Client's projects
    if (req.user!.role === 'CLIENT') {
      whereClause.task = {
        project: {
          clients: {
            some: {
              clientId: req.user!.clientEntityId ?? '__no_access__'
            }
          }
        }
      };
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    if (employeeId) whereClause.employeeId = employeeId;
    if (projectId) {
      whereClause.task = {
        projectId: projectId as string
      };
    }

    // Fetch records with pagination and total count in parallel
    const [timeRecords, totalCount] = await Promise.all([
      prisma.timeRecord.findMany({
        where: whereClause,
        include: {
          task: {
            select: {
              title: true,
              project: {
                select: {
                  name: true,
                  clients: {
                    include: {
                      client: {
                        select: {
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take,
        skip
      }),
      prisma.timeRecord.count({ where: whereClause })
    ]);

    // Use groupBy for aggregate summaries (across all matching records, not just current page)
    const [byProjectAgg, byEmployeeAgg, totalAgg] = await Promise.all([
      prisma.timeRecord.groupBy({
        by: ['taskId'],
        where: whereClause,
        _sum: { duration: true }
      }),
      prisma.timeRecord.groupBy({
        by: ['employeeId'],
        where: whereClause,
        _sum: { duration: true }
      }),
      prisma.timeRecord.aggregate({
        where: whereClause,
        _sum: { duration: true }
      })
    ]);

    // Resolve project names for groupBy results
    const taskIds = byProjectAgg.map(r => r.taskId);
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, project: { select: { name: true } } }
    });
    const taskProjectMap = new Map(tasks.map(t => [t.id, t.project.name]));

    const byProject: Record<string, number> = {};
    for (const row of byProjectAgg) {
      const projectName = taskProjectMap.get(row.taskId) || 'Unknown';
      byProject[projectName] = (byProject[projectName] || 0) + (row._sum.duration || 0) / 60;
    }

    // Resolve employee names
    const employeeIds = byEmployeeAgg.map(r => r.employeeId);
    const employees = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true }
    });
    const employeeNameMap = new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`]));

    const byEmployee: Record<string, number> = {};
    for (const row of byEmployeeAgg) {
      const name = employeeNameMap.get(row.employeeId) || 'Unknown';
      byEmployee[name] = (row._sum.duration || 0) / 60;
    }

    const totalHours = (totalAgg._sum.duration || 0) / 60;

    // Round values
    for (const key of Object.keys(byProject)) {
      byProject[key] = Math.round(byProject[key] * 100) / 100;
    }
    for (const key of Object.keys(byEmployee)) {
      byEmployee[key] = Math.round(byEmployee[key] * 100) / 100;
    }

    res.json({
      success: true,
      data: {
        timeRecords,
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          byProject,
          byEmployee
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Project status report
router.get('/project-status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { take, skip, page, limit } = parsePagination(req.query);
    const { status } = req.query;

    let whereClause: any = {};
    if (status) whereClause.status = status;

    // CLIENT: filter to projects belonging to their linked Client entity
    if (req.user!.role === 'CLIENT') {
      whereClause.clients = {
        some: {
          clientId: req.user!.clientEntityId ?? '__no_access__'
        }
      };
    }

    // Fetch projects with pagination
    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: {
          clients: {
            include: {
              client: {
                select: {
                  name: true
                }
              }
            }
          },
          tasks: {
            select: {
              id: true,
              status: true,
              timeEstimate: true
            }
          }
        },
        orderBy: { startDate: 'desc' },
        take,
        skip
      }),
      prisma.project.count({ where: whereClause })
    ]);

    // Batch fetch time record durations for all tasks in these projects
    const allTaskIds = projects.flatMap(p => p.tasks.map(t => t.id));
    const durationsByTask = allTaskIds.length > 0
      ? await prisma.timeRecord.groupBy({
          by: ['taskId'],
          where: {
            taskId: { in: allTaskIds },
            status: 'COMPLETED'
          },
          _sum: { duration: true }
        })
      : [];

    const durationMap = new Map(durationsByTask.map(d => [d.taskId, d._sum.duration || 0]));

    const report = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const inProgressTasks = project.tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const newTasks = project.tasks.filter(t => t.status === 'NEW').length;
      const waitingTasks = project.tasks.filter(t => t.status === 'WAITING_CLIENT').length;

      const estimatedHours = project.tasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
      const actualMinutes = project.tasks.reduce((sum, task) => sum + (durationMap.get(task.id) || 0), 0);
      const actualHours = actualMinutes / 60;

      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        project: {
          id: project.id,
          name: project.name,
          client: project.clients.map((pc: any) => pc.client.name).join(', '),
          status: project.status
        },
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          newTasks,
          waitingTasks,
          completionPercentage,
          estimatedHours: Math.round(estimatedHours * 100) / 100,
          actualHours: Math.round(actualHours * 100) / 100
        }
      };
    });

    res.json({
      success: true,
      data: {
        projects: report,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Employee performance report
router.get('/employee-performance', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
    }

    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true
      },
      include: {
        timeRecords: {
          where: {
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
          },
          select: {
            duration: true
          }
        },
        assignedTasks: {
          include: {
            task: {
              select: {
                status: true,
                deadline: true
              }
            }
          }
        }
      }
    });

    const report = employees.map(employee => {
      const totalHours = employee.timeRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / 60;
      const completedTasks = employee.assignedTasks.filter(at => at.task.status === 'COMPLETED').length;
      const totalTasks = employee.assignedTasks.length;
      const onTimeTasks = employee.assignedTasks.filter(at =>
        at.task.status === 'COMPLETED' &&
        at.task.deadline &&
        new Date(at.task.deadline) >= new Date()
      ).length;

      const onTimePercentage = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email
        },
        stats: {
          totalHours: Math.round(totalHours * 100) / 100,
          totalTasks,
          completedTasks,
          completionPercentage,
          onTimePercentage
        }
      };
    });

    res.json({
      success: true,
      data: { employees: report }
    });
  } catch (error) {
    next(error);
  }
});

// Open tasks report
router.get('/open-tasks', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = {
      status: { not: 'COMPLETED' }
    };

    // CLIENT: filter to tasks in their linked Client's projects
    if (req.user!.role === 'CLIENT') {
      whereClause.project = {
        clients: {
          some: {
            clientId: req.user!.clientEntityId ?? '__no_access__'
          }
        }
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: { name: true, clients: { include: { client: { select: { name: true } } } } }
        },
        assignedUsers: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            client: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { deadline: 'asc' }
      ]
    });

    const now = new Date();
    const statusCounts = {
      NEW: tasks.filter(t => t.status === 'NEW').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      WAITING_CLIENT: tasks.filter(t => t.status === 'WAITING_CLIENT').length,
    };

    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now).length;

    res.json({
      success: true,
      data: {
        tasks,
        summary: {
          total: tasks.length,
          ...statusCounts,
          overdue
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
