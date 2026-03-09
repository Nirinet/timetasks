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
  LinearProgress,
  Avatar,
  AvatarGroup,
} from '@mui/material'
import {
  Assignment as TaskIcon,
  FolderOpen as ProjectIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  HourglassBottom as WaitingIcon,
} from '@mui/icons-material'

import api from '@/services/api'
import { Task, Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

interface ClientStats {
  myProjects: number
  myTasks: number
  completedTasks: number
  hoursThisMonth: number
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<ClientStats>({
    myProjects: 0,
    myTasks: 0,
    completedTasks: 0,
    hoursThisMonth: 0,
  })
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [waitingTasks, setWaitingTasks] = useState<Task[]>([])
  const [recentActivity, setRecentActivity] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      const [projectsRes, tasksRes] = await Promise.all([
        api.get('/projects'), // Client will only see their projects
        api.get('/tasks'), // Client will only see their tasks
      ])

      const projects = projectsRes.data.data.projects
      const tasks = tasksRes.data.data.tasks

      const completedTasks = tasks.filter((task: Task) => task.status === 'COMPLETED')
      const waiting = tasks.filter((task: Task) => task.status === 'WAITING_CLIENT')
      const recentTasks = tasks
        .filter((task: Task) => task.status !== 'COMPLETED')
        .slice(0, 5)

      setStats({
        myProjects: projects.length,
        myTasks: tasks.length,
        completedTasks: completedTasks.length,
        hoursThisMonth: 0,
      })

      setMyProjects(projects.slice(0, 5))
      setMyTasks(tasks.slice(0, 5))
      setWaitingTasks(waiting)
      setRecentActivity(recentTasks)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const getProjectProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0
    const completed = project.tasks.filter(task => task.status === 'COMPLETED').length
    return Math.round((completed / project.tasks.length) * 100)
  }

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
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="הפרויקטים שלי"
          value={stats.myProjects}
          icon={<ProjectIcon />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="המשימות שלי"
          value={stats.myTasks}
          icon={<TaskIcon />}
          color="secondary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="משימות הושלמו"
          value={stats.completedTasks}
          icon={<CheckIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="שעות החודש"
          value={stats.hoursThisMonth}
          icon={<ScheduleIcon />}
          color="info"
        />
      </Grid>

      {/* My Projects */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              הפרויקטים שלי
            </Typography>
            <List>
              {myProjects.map((project) => {
                const progress = getProjectProgress(project)
                return (
                  <ListItem key={project.id}>
                    <ListItemIcon>
                      <ProjectIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">
                            {project.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={project.status}
                            color={getProjectStatusColor(project.status)}
                          />
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Typography variant="body2" color="text.secondary">
                            התקדמות: {progress}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ mt: 0.5 }}
                          />
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

      {/* Waiting for your response */}
      {waitingTasks.length > 0 && (
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WaitingIcon color="warning" />
                <Typography variant="h6">
                  ממתינות לתגובתך ({waitingTasks.length})
                </Typography>
              </Box>
              <List>
                {waitingTasks.map((task) => (
                  <ListItem key={task.id}>
                    <ListItemIcon>
                      <TaskIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={task.project?.name}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Recent Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              פעילות אחרונה
            </Typography>
            <List>
              {recentActivity.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="אין פעילות אחרונה"
                    secondary="כל המשימות הושלמו"
                  />
                </ListItem>
              ) : (
                recentActivity.map((task) => (
                  <ListItem key={task.id}>
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
                          {task.assignedUsers && task.assignedUsers.length > 0 && (
                            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '12px' } }}>
                              {task.assignedUsers
                                .filter(au => au.user)
                                .map((au) => (
                                  <Avatar key={au.user!.firstName}>
                                    {au.user!.firstName.charAt(0)}
                                  </Avatar>
                                ))}
                            </AvatarGroup>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              פעולות מהירות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • צור משימה חדשה בפרויקט קיים<br />
              • העלה קבצים למשימות<br />
              • הוסף תגובות והערות<br />
              • עקוב אחר התקדמות הפרויקטים<br />
              • צפה בדוחות זמן עבודה
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ClientDashboard