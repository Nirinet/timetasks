import React, { useEffect, useState } from 'react'
import {
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Badge,
  CircularProgress,
} from '@mui/material'
import {
  Assignment as TaskIcon,
  Comment as CommentIcon,
  Schedule as TimerIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

import { Alert } from '@/types'
import api from '@/services/api'

interface NotificationPanelProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  anchorEl,
  open,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAlerts()
    }
  }, [open])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await api.get('/alerts?unread=true')
      setAlerts(response.data.data.alerts)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      await api.put(`/alerts/${alertId}/read`)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ))
    } catch (error) {

    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/alerts/mark-all-read')
      setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })))
    } catch (error) {

    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'NEW_TASK':
      case 'TASK_ASSIGNMENT':
        return <TaskIcon color="primary" />
      case 'NEW_COMMENT':
        return <CommentIcon color="info" />
      case 'ACTIVE_TIMER':
      case 'DEADLINE_APPROACHING':
        return <TimerIcon color="warning" />
      case 'DEADLINE_EXCEEDED':
        return <WarningIcon color="error" />
      default:
        return <TaskIcon />
    }
  }

  const unreadCount = alerts.filter(alert => !alert.isRead).length

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 8,
        sx: {
          width: 360,
          maxHeight: 480,
          overflow: 'hidden',
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            הודעות
            {unreadCount > 0 && (
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              סמן הכול כנקרא
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      ) : alerts.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="text.secondary">
            אין הודעות חדשות
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0, maxHeight: 320, overflow: 'auto' }}>
          {alerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              <ListItem
                button
                onClick={() => markAsRead(alert.id)}
                sx={{
                  bgcolor: alert.isRead ? 'transparent' : 'action.hover',
                }}
              >
                <ListItemIcon>
                  {getAlertIcon(alert.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={alert.isRead ? 'normal' : 'bold'}
                    >
                      {alert.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alert.createdAt).toLocaleString('he-IL')}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < alerts.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Menu>
  )
}

export default NotificationPanel