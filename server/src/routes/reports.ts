import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdminOrEmployee, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Hours summary report
router.get('/hours', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, employeeId, projectId } = req.query;
    
    let whereClause: any = {
      status: 'COMPLETED'
    };

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

    const timeRecords = await prisma.timeRecord.findMany({
      where: whereClause,
      include: {
        task: {
          select: {
            title: true,
            project: {
              select: {
                name: true,
                client: {
                  select: {
                    name: true
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
      orderBy: { date: 'desc' }
    });

    // Calculate summaries
    const totalHours = timeRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / 60;
    
    const byProject = timeRecords.reduce((acc, record) => {
      const projectName = record.task.project.name;
      if (!acc[projectName]) acc[projectName] = 0;
      acc[projectName] += (record.duration || 0) / 60;
      return acc;
    }, {} as Record<string, number>);

    const byEmployee = timeRecords.reduce((acc, record) => {
      const employeeName = `${record.employee.firstName} ${record.employee.lastName}`;
      if (!acc[employeeName]) acc[employeeName] = 0;
      acc[employeeName] += (record.duration || 0) / 60;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        timeRecords,
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          byProject,
          byEmployee
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Project status report
router.get('/project-status', authenticateToken, requireAdminOrEmployee, async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: {
          select: {
            name: true
          }
        },
        tasks: {
          select: {
            status: true,
            timeEstimate: true,
            timeRecords: {
              select: {
                duration: true
              }
            }
          }
        }
      }
    });

    const report = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const inProgressTasks = project.tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const newTasks = project.tasks.filter(t => t.status === 'NEW').length;
      const waitingTasks = project.tasks.filter(t => t.status === 'WAITING_CLIENT').length;
      
      const estimatedHours = project.tasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
      const actualHours = project.tasks.reduce((sum, task) => 
        sum + task.timeRecords.reduce((taskSum, record) => taskSum + (record.duration || 0), 0) / 60, 0);
      
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        project: {
          id: project.id,
          name: project.name,
          client: project.client.name,
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
      data: { projects: report }
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
          include: {
            task: {
              select: {
                status: true,
                deadline: true
              }
            }
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

export default router;