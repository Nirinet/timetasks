import React, { useEffect, useState } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material'
import {
  People as PeopleIcon,
  Assignment as TasksIcon,
  FolderOpen as ProjectsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

import api from '@/services/api'
import { Task, Project, User } from '@/types'

interface DashboardStats {
  totalUsers: number
  totalProjects: number
  totalTasks: number
  activeTasks: number
  overdueTasks: number
  totalHoursThisMonth: number
}

const AdminDashboard: React.FC = () => {
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
        totalHoursThisMonth: hoursData.summary?.totalHours || 0,
      })

      setRecentTasks(tasks.slice(0, 5))
      setRecentProjects(projects.slice(0, 5))
      setActiveEmployees(users.filter((u: User) => u.role === 'EMPLOYEE' && u.isActive))
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon, color = 'primary' }: {
    title: string
    value: number | string
    icon: React.ReactElement
    color?: string
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.contrastText`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'default'
      case 'IN_PROGRESS': return 'primary'
      case 'WAITING_CLIENT': return 'warning'
      case 'COMPLETED': return 'success'
      default: return 'default'
    }
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success'
      case 'ON_HOLD': return 'warning'
      case 'COMPLETED': return 'info'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <Box>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>טוען נתוני דשבורד...</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="סך משתמשים"
          value={stats.totalUsers}
          icon={<PeopleIcon />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="סך פרויקטים"
          value={stats.totalProjects}
          icon={<ProjectsIcon />}
          color="secondary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="סך משימות"
          value={stats.totalTasks}
          icon={<TasksIcon />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="משימות פעילות"
          value={stats.activeTasks}
          icon={<TrendingUpIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="משימות באיחור"
          value={stats.overdueTasks}
          icon={<WarningIcon />}
          color="error"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <StatCard
          title="שעות החודש"
          value={Math.round(stats.totalHoursThisMonth)}
          icon={<ScheduleIcon />}
          color="warning"
        />
      </Grid>

      {/* Recent Tasks */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              משימות אחרונות
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>כותרת</TableCell>
                    <TableCell>פרויקט</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>תאריך יצירה</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>{task.project.name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={task.status}
                          color={getTaskStatusColor(task.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(task.creationDate).toLocaleDateString('he-IL')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Projects */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              פרויקטים אחרונים
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>לקוח</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>תאריך התחלה</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.clients?.map((pc: any) => pc.client.name).join(', ')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={project.status}
                          color={getProjectStatusColor(project.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(project.startDate).toLocaleDateString('he-IL')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Employees */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              עובדים פעילים ({activeEmployees.length})
            </Typography>
            <Grid container spacing={2}>
              {activeEmployees.map((employee) => (
                <Grid item key={employee.id}>
                  <Chip
                    label={`${employee.firstName} ${employee.lastName}`}
                    variant="outlined"
                    color="primary"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AdminDashboard