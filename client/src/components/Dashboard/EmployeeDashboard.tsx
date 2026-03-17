import React, { useEffect, useState } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  LinearProgress,
  Divider,
} from '@mui/material'
import {
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'

import api from '@/services/api'
import { Task, TimeRecord } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

interface EmployeeStats {
  myTasks: number
  activeTasks: number
  completedThisWeek: number
  hoursThisWeek: number
  hoursToday: number
  overdueTasks: number
}

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<EmployeeStats>({
    myTasks: 0,
    activeTasks: 0,
    completedThisWeek: 0,
    hoursThisWeek: 0,
    hoursToday: 0,
    overdueTasks: 0,
  })
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [activeTimers, setActiveTimers] = useState<TimeRecord[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const [tasksRes, timersRes, hoursRes, todayRes] = await Promise.all([
        api.get(`/tasks?assignedTo=${user.id}`),
        api.get('/time/active'),
        api.get(`/reports/hours?employeeId=${user.id}`),
        api.get(`/reports/hours?employeeId=${user.id}&startDate=${today}&endDate=${today}`),
      ])

      const tasks = tasksRes.data.data.tasks
      const timers = timersRes.data.data.activeTimers
      const hoursData = hoursRes.data.data
      const todayData = todayRes.data.data

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      const activeTasks = tasks.filter((task: Task) => 
        task.status === 'IN_PROGRESS' || task.status === 'NEW'
      )
      const completedThisWeek = tasks.filter((task: Task) => 
        task.status === 'COMPLETED' && new Date(task.creationDate) >= weekAgo
      ).length
      const overdueTasks = tasks.filter((task: Task) => 
        task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED'
      )
      const upcoming = tasks.filter((task: Task) => 
        task.deadline && 
        new Date(task.deadline) > now && 
        new Date(task.deadline) <= threeDaysFromNow &&
        task.status !== 'COMPLETED'
      )

      setStats({
        myTasks: tasks.length,
        activeTasks: activeTasks.length,
        completedThisWeek,
        hoursThisWeek: hoursData.summary?.totalHours || 0,
        hoursToday: todayData.summary?.totalHours || 0,
        overdueTasks: overdueTasks.length,
      })

      setMyTasks(tasks.slice(0, 5))
      setActiveTimers(timers)
      setUpcomingDeadlines(upcoming.slice(0, 5))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTimer = async (taskId: string) => {
    try {
      await api.post('/time/start', { taskId })
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Error starting timer:', error)
    }
  }

  const stopTimer = async (timerId: string) => {
    try {
      await api.post(`/time/stop/${timerId}`)
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Error stopping timer:', error)
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
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
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="המשימות שלי"
          value={stats.myTasks}
          icon={<TaskIcon />}
          color="primary"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="משימות פעילות"
          value={stats.activeTasks}
          icon={<TrendingUpIcon />}
          color="info"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="הושלמו השבוע"
          value={stats.completedThisWeek}
          icon={<TaskIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="שעות היום"
          value={Math.round(stats.hoursToday * 10) / 10}
          icon={<ScheduleIcon />}
          color="secondary"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="שעות השבוע"
          value={Math.round(stats.hoursThisWeek)}
          icon={<ScheduleIcon />}
          color="warning"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <StatCard
          title="משימות באיחור"
          value={stats.overdueTasks}
          icon={<WarningIcon />}
          color="error"
        />
      </Grid>

      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                טיימרים פעילים
              </Typography>
              <List>
                {activeTimers.map((timer) => (
                  <ListItem
                    key={timer.id}
                    secondaryAction={
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={() => stopTimer(timer.id)}
                      >
                        עצור
                      </Button>
                    }
                  >
                    <ListItemIcon>
                      <ScheduleIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={timer.task.title}
                      secondary={`התחיל: ${new Date(timer.startTime).toLocaleTimeString('he-IL')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* My Tasks */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              המשימות שלי
            </Typography>
            <List>
              {myTasks.map((task) => {
                const hasActiveTimer = activeTimers.some(timer => timer.task.title === task.title)
                return (
                  <ListItem
                    key={task.id}
                    secondaryAction={
                      !hasActiveTimer && task.status !== 'COMPLETED' && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayIcon />}
                          onClick={() => startTimer(task.id)}
                        >
                          התחל
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon>
                      <TaskIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            size="small"
                            label={task.status}
                            color={getTaskStatusColor(task.status)}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {task.project.name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Deadlines */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              דדליינים קרובים
            </Typography>
            <List>
              {upcomingDeadlines.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="אין דדליינים קרובים"
                    secondary="כל הטוב!"
                  />
                </ListItem>
              ) : (
                upcomingDeadlines.map((task) => (
                  <ListItem key={task.id}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={`דדליין: ${new Date(task.deadline!).toLocaleDateString('he-IL')}`}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default EmployeeDashboard