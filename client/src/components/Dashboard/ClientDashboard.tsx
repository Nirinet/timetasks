import React, { useEffect, useState } from 'react'
import {
  Grid,
  Card,
  Typography,
  Box,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Button,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

import api from '@/services/api'
import { Task, Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import StatusChip from '@/components/StatusChip'
import ProjectStatusChip from '@/components/ProjectStatusChip'

interface ClientStats {
  myProjects: number
  myTasks: number
  completedTasks: number
  hoursThisMonth: number
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<ClientStats>({
    myProjects: 0,
    myTasks: 0,
    completedTasks: 0,
    hoursThisMonth: 0,
  })
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [waitingTasks, setWaitingTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      const [projectsRes, tasksRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks'),
      ])

      const projects = projectsRes.data.data.projects
      const tasks = tasksRes.data.data.tasks
      const completedTasks = tasks.filter((task: Task) => task.status === 'COMPLETED')
      const waiting = tasks.filter((task: Task) => task.status === 'WAITING_CLIENT')

      setStats({
        myProjects: projects.length,
        myTasks: tasks.length,
        completedTasks: completedTasks.length,
        hoursThisMonth: 0,
      })

      setMyProjects(projects.slice(0, 5))
      setWaitingTasks(waiting.slice(0, 3))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProjectProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0
    const completed = project.tasks.filter(task => task.status === 'COMPLETED').length
    return Math.round((completed / project.tasks.length) * 100)
  }

  if (loading) {
    return (
      <Box>
        <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>טוען נתוני דשבורד...</Typography>
      </Box>
    )
  }

  const today = new Date()
  const dayName = today.toLocaleDateString('he-IL', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Greeting */}
      <Box>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
          שלום, {user?.firstName}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
          הנה סקירה של הפרויקטים והמשימות שלך להיום.
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>
          {dayName}, {dateStr}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2.5}>
        {[
          { label: 'הפרויקטים שלי', value: stats.myProjects, icon: 'folder_open', color: '#2d7b95', badge: `+2 חודש` },
          { label: 'המשימות שלי', value: stats.myTasks, icon: 'task_alt', color: '#2d7b95' },
          { label: 'משימות שהושלמו', value: stats.completedTasks, icon: 'check_circle', color: '#10b981' },
          { label: 'שעות החודש', value: stats.hoursThisMonth, icon: 'schedule', color: '#2d7b95' },
        ].map((card, idx) => (
          <Grid item xs={6} md={3} key={idx}>
            <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    bgcolor: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: card.color }}>{card.icon}</span>
                </Box>
                {card.badge && (
                  <Box sx={{ px: 1, py: 0.25, borderRadius: '9999px', bgcolor: '#ecfdf5', color: '#047857', fontSize: '0.6875rem', fontWeight: 500 }}>
                    {card.badge}
                  </Box>
                )}
              </Box>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>{card.label}</Typography>
              <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', mt: 0.5 }}>{card.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Waiting Tasks Section */}
      {waitingTasks.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f97316' }}>priority_high</span>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              ממתינות לתגובתך
            </Typography>
          </Box>
          <Grid container spacing={2.5}>
            {waitingTasks.map((task) => (
              <Grid item xs={12} md={6} key={task.id}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    borderRight: '4px solid #f97316',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
                  }}
                  onClick={() => navigate('/tasks')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: '4px',
                        bgcolor: '#ffedd5',
                        color: '#c2410c',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      WAITING_CLIENT
                    </Box>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      לפני שעה
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                    {task.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>
                    פרויקט: {task.project?.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>}
                      sx={{
                        bgcolor: '#2d7b95',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        px: 2,
                        py: 0.75,
                        '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
                      }}
                    >
                      הוסף תגובה
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: '#e2e8f0',
                        color: '#475569',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        px: 2,
                        py: 0.75,
                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                      }}
                    >
                      צפה בקבצים
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Projects Table */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            הפרויקטים שלי
          </Typography>
          <Box
            component="span"
            onClick={() => navigate('/projects')}
            sx={{ fontSize: '0.875rem', color: '#2d7b95', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            צפה בכל הפרויקטים
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          {/* Table header */}
          <Box sx={{ display: 'flex', px: 3, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9', minWidth: 500 }}>
            <Typography sx={{ flex: 2, fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>שם הפרויקט</Typography>
            <Typography sx={{ flex: 1, fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>סטטוס</Typography>
            <Typography sx={{ flex: 1, fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>משימות</Typography>
            <Typography sx={{ flex: 1.5, fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>התקדמות</Typography>
          </Box>
          {/* Table rows */}
          {myProjects.map((project) => {
            const progress = getProjectProgress(project)
            const totalTasks = project.tasks?.length || 0
            const completedTasks = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0
            return (
              <Box
                key={project.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 3,
                  py: 2,
                  minWidth: 500,
                  borderBottom: '1px solid #f1f5f9',
                  '&:hover': { bgcolor: '#f8fafc' },
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/projects')}
              >
                <Box sx={{ flex: 2 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{project.name}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {project.clients?.map((pc: any) => pc.client?.name).join(', ')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <ProjectStatusChip status={project.status} size="small" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {completedTasks} / {totalTasks}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flex: 1, height: 8, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', bgcolor: '#2d7b95', borderRadius: 4, width: `${progress}%` }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', minWidth: 35 }}>
                    {progress}%
                  </Typography>
                </Box>
              </Box>
            )
          })}
          {myProjects.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>אין פרויקטים עדיין</Typography>
            </Box>
          )}
        </Box>
      </Card>

      {/* Support CTA */}
      <Card
        sx={{
          p: 3,
          borderRadius: '12px',
          bgcolor: 'rgba(45,123,149,0.05)',
          border: '1px solid rgba(45,123,149,0.1)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
            תמיכה
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
            צריך עזרה עם הפרויקט?
          </Typography>
        </Box>
        <Button
          variant="contained"
          sx={{
            bgcolor: '#2d7b95',
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
          }}
        >
          צור קשר
        </Button>
      </Card>
    </Box>
  )
}

export default ClientDashboard
