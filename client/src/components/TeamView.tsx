import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

import api from '@/services/api'
import { Task, User } from '@/types'
import StatusChip from '@/components/StatusChip'

interface TeamViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

interface TeamMember {
  id: string
  name: string
  role: string
  activeTasks: Task[]
  completedTasks: number
  totalTasks: number
  weeklyHours: number
}

const TeamView: React.FC<TeamViewProps> = ({ tasks, onTaskClick }) => {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users')
        const data = response.data.data?.users || response.data.data || []
        setUsers(data.filter((u: User) => u.role !== 'CLIENT' && u.isActive))
      } catch {
        // silent
      }
    }
    fetchUsers()
  }, [])

  // Build team member data from tasks + users
  const teamMembers: TeamMember[] = users.map((user) => {
    const userTasks = tasks.filter((task) =>
      task.assignedUsers?.some((a) => a.userId === user.id)
    )

    const activeTasks = userTasks.filter((t) => t.status !== 'COMPLETED')
    const completedTasks = userTasks.filter((t) => t.status === 'COMPLETED').length

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role === 'ADMIN' ? 'מנהל' : 'עובד',
      activeTasks,
      completedTasks,
      totalTasks: userTasks.length,
      weeklyHours: 0, // Will be populated if we add time tracking data
    }
  })

  if (teamMembers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">אין חברי צוות להצגה</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={3}>
      {teamMembers.map((member) => {
        const completionPct = member.totalTasks > 0
          ? Math.round((member.completedTasks / member.totalTasks) * 100)
          : 0

        return (
          <Grid item xs={12} sm={6} md={4} key={member.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                    {member.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {member.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.role}
                    </Typography>
                  </Box>
                </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AssignmentIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {member.activeTasks.length} פעילות
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {member.completedTasks}/{member.totalTasks} הושלמו
                    </Typography>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      התקדמות
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {completionPct}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionPct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: completionPct >= 80 ? 'success.main' : completionPct >= 50 ? 'warning.main' : 'primary.main',
                      },
                    }}
                  />
                </Box>

                {/* Active Tasks */}
                {member.activeTasks.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                      משימות פעילות
                    </Typography>
                    {member.activeTasks.slice(0, 4).map((task) => (
                      <Box
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                          {task.title}
                        </Typography>
                        <StatusChip status={task.status} size="small" />
                      </Box>
                    ))}
                    {member.activeTasks.length > 4 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                        +{member.activeTasks.length - 4} עוד
                      </Typography>
                    )}
                  </Box>
                )}

                {member.totalTasks === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    אין משימות מוקצות
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default TeamView
