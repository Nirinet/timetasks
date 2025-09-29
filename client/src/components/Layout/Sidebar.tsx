import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Avatar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assignment as TasksIcon,
  FolderOpen as ProjectsIcon,
  People as ClientsIcon,
  Schedule as TimeIcon,
  Assessment as ReportsIcon,
  SupervisorAccount as UsersIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'

import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  onItemClick?: () => void
}

interface MenuItem {
  label: string
  path: string
  icon: React.ReactElement
  roles: string[]
}

const menuItems: MenuItem[] = [
  {
    label: 'דשבורד',
    path: '/',
    icon: <DashboardIcon />,
    roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'],
  },
  {
    label: 'משימות',
    path: '/tasks',
    icon: <TasksIcon />,
    roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'],
  },
  {
    label: 'פרויקטים',
    path: '/projects',
    icon: <ProjectsIcon />,
    roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'],
  },
  {
    label: 'לקוחות',
    path: '/clients',
    icon: <ClientsIcon />,
    roles: ['ADMIN', 'EMPLOYEE'],
  },
  {
    label: 'מעקב זמן',
    path: '/time-tracking',
    icon: <TimeIcon />,
    roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'],
  },
  {
    label: 'דוחות',
    path: '/reports',
    icon: <ReportsIcon />,
    roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'],
  },
  {
    label: 'משתמשים',
    path: '/users',
    icon: <UsersIcon />,
    roles: ['ADMIN'],
  },
]

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleItemClick = (path: string) => {
    navigate(path)
    if (onItemClick) {
      onItemClick()
    }
  }

  const filteredMenuItems = menuItems.filter(item =>
    user && item.roles.includes(user.role)
  )

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'מנהל מערכת'
      case 'EMPLOYEE':
        return 'עובד'
      case 'CLIENT':
        return 'לקוח'
      default:
        return role
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Profile Section */}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 1,
            bgcolor: 'primary.main',
            fontSize: '24px',
          }}
        >
          {user?.firstName.charAt(0)}
        </Avatar>
        <Typography variant="h6" noWrap>
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user && getRoleText(user.role)}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick(item.path)}
                  selected={isActive}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>

      <Divider />

      {/* Settings */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick('/profile')}
            sx={{
              mx: 1,
              borderRadius: 1,
            }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="הגדרות" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )
}

export default Sidebar