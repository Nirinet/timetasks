import React, { useEffect, useState } from 'react'
import {
  Grid,
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Avatar,
  Link,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

import api from '@/services/api'
import { Task, Project, User } from '@/types'
import StatusChip from '@/components/StatusChip'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import { getStatusLabel } from '@/utils/formatters'

interface DashboardStats {
  totalUsers: number
  totalProjects: number
  totalTasks: number
  activeTasks: number
  overdueTasks: number
  totalHoursThisMonth: number
}

const statCardConfig = [
  { key: 'totalUsers', label: 'סה"כ משתמשים', icon: 'group', color: '#2d7b95' },
  { key: 'totalProjects', label: 'פרויקטים', icon: 'folder_open', color: '#2d7b95' },
  { key: 'totalTasks', label: 'משימות', icon: 'task_alt', color: '#2d7b95' },
  { key: 'activeTasks', label: 'משימות פעילות', icon: 'bolt', color: '#f97316' },
  { key: 'overdueTasks', label: 'משימות בסיכון', icon: 'warning', color: '#ef4444' },
  { key: 'totalHoursThisMonth', label: 'שעות חודשיות', icon: 'schedule', color: '#2d7b95' },
]

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    totalHoursThisMonth: 0,
  })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [activeEmployees, setActiveEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [usersRes, projectsRes, tasksRes, hoursRes] = await Promise.all([
        api.get('/users'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/reports/hours'),
      ])

      const users = usersRes.data.data.users
      const projects = projectsRes.data.data.projects
      const tasks = tasksRes.data.data.tasks
      const hoursData = hoursRes.data.data

      const now = new Date()
      const activeTasks = tasks.filter((task: Task) =>
        task.status === 'IN_PROGRESS' || task.status === 'NEW'
      )
      const overdueTasks = tasks.filter((task: Task) =>
        task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED'
      )

      setStats({
        totalUsers: users.length,
        totalProjects: projects.length,
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        totalHoursThisMonth: Math.round(hoursData.summary?.totalHours || 0),
      })

      setRecentTasks(tasks.slice(0, 5))
      setRecentProjects(projects.slice(0, 5))
      setActiveEmployees(users.filter((u: User) => u.role === 'EMPLOYEE' && u.isActive).slice(0, 5))
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box>
        <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>טוען נתוני דשבורד...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Stats Cards */}
      <Grid container spacing={2.5}>
        {statCardConfig.map((config) => (
          <Grid item xs={6} sm={4} md={2} key={config.key}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: `${config.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: config.color }}>{config.icon}</span>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 0.5 }}>
                {config.label}
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                {typeof stats[config.key as keyof DashboardStats] === 'number'
                  ? stats[config.key as keyof DashboardStats].toLocaleString()
                  : stats[config.key as keyof DashboardStats]}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={3}>
        {/* Recent Tasks */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                5 משימות אחרונות
              </Typography>
              <Link
                onClick={() => navigate('/tasks')}
                sx={{ fontSize: '0.875rem', color: '#2d7b95', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                הצג הכל
              </Link>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500, fontSize: '0.8125rem' }}>כותרת</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500, fontSize: '0.8125rem' }}>פרויקט</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500, fontSize: '0.8125rem' }}>סטטוס</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500, fontSize: '0.8125rem' }}>עדיפות</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500, fontSize: '0.8125rem' }}>תאריך יעד</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTasks.map((task) => (
                    <TableRow key={task.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }}>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{task.title}</TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.875rem' }}>{task.project?.name}</TableCell>
                      <TableCell><StatusChip status={task.status} size="small" /></TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            borderRadius: '4px',
                            bgcolor: task.priority === 'URGENT_IMPORTANT' ? '#fee2e2' : task.priority === 'IMPORTANT' ? '#ffedd5' : '#f1f5f9',
                            color: task.priority === 'URGENT_IMPORTANT' ? '#dc2626' : task.priority === 'IMPORTANT' ? '#ea580c' : '#64748b',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {task.priority === 'URGENT_IMPORTANT' ? 'דחוף' : task.priority === 'IMPORTANT' ? 'חשוב' : task.priority === 'LOW' ? 'נמוך' : 'רגיל'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('he-IL') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Active Employees */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                עובדים פעילים
              </Typography>
              <Link
                onClick={() => navigate('/users')}
                sx={{ fontSize: '0.875rem', color: '#2d7b95', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                הצג הכל
              </Link>
            </Box>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeEmployees.map((employee) => (
                <Box key={employee.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={employee.avatar}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: '#2d7b95',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {employee.firstName?.charAt(0)}
                    </Avatar>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: '#10b981',
                        border: '2px solid white',
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {employee.firstName} {employee.lastName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {employee.role === 'EMPLOYEE' ? 'עובד' : employee.role === 'ADMIN' ? 'מנהל' : 'לקוח'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '9999px',
                      bgcolor: '#d1fae5',
                      color: '#047857',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}
                  >
                    מחובר
                  </Box>
                </Box>
              ))}
              {activeEmployees.length === 0 && (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', py: 3 }}>
                  אין עובדים פעילים
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Projects */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            5 פרויקטים אחרונים
          </Typography>
          <Link
            onClick={() => navigate('/projects')}
            sx={{ fontSize: '0.875rem', color: '#2d7b95', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            הצג הכל
          </Link>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500 }}>שם הפרויקט</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500 }}>לקוח</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500 }}>סטטוס</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 500 }}>התקדמות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentProjects.map((project) => (
                <TableRow key={project.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 500 }}>{project.name}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{project.clients?.map((pc: any) => pc.client.name).join(', ')}</TableCell>
                  <TableCell><ProjectStatusChip status={project.status} size="small" /></TableCell>
                  <TableCell>
                    {(() => {
                      const total = project.tasks?.length || project._count?.tasks || 0
                      const done = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1, height: 8, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', bgcolor: '#2d7b95', borderRadius: 4, width: `${pct}%` }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', minWidth: 35 }}>
                            {pct}%
                          </Typography>
                        </Box>
                      )
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

export default AdminDashboard
