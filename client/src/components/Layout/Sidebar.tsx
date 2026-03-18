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
import { useAuth } from '@/contexts/AuthContext'
import logoSrc from '@/assets/logo.svg'

interface SidebarProps {
  onItemClick?: () => void
}

interface MenuItem {
  label: string
  path: string
  icon: string // Material Symbols icon name
  roles: string[]
}

const menuItems: MenuItem[] = [
  { label: 'לוח בקרה', path: '/', icon: 'dashboard', roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'משימות', path: '/tasks', icon: 'task_alt', roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'פרויקטים', path: '/projects', icon: 'folder_open', roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'לקוחות', path: '/clients', icon: 'person_search', roles: ['ADMIN', 'EMPLOYEE'] },
  { label: 'מעקב זמן', path: '/time-tracking', icon: 'schedule', roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'טיימר נייד', path: '/timer', icon: 'phone_iphone', roles: ['ADMIN', 'EMPLOYEE'] },
  { label: 'דוחות', path: '/reports', icon: 'bar_chart', roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'משתמשים', path: '/users', icon: 'group', roles: ['ADMIN'] },
  { label: 'הגדרות', path: '/settings', icon: 'settings', roles: ['ADMIN'] },
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
      case 'ADMIN': return 'מנהל מערכת'
      case 'EMPLOYEE': return 'עובד'
      case 'CLIENT': return 'לקוח'
      default: return role
    }
  }

  // Separate main nav items from settings
  const mainNavItems = filteredMenuItems.filter(i => i.path !== '/settings')
  const settingsItem = filteredMenuItems.find(i => i.path === '/settings')

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Logo Section */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => handleItemClick('/')}
      >
        <Box
          component="img"
          src={logoSrc}
          alt="TimeTask"
          sx={{
            height: 40,
            width: 'auto',
            maxWidth: '100%',
          }}
        />
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0 }}>
          {mainNavItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick(item.path)}
                  selected={isActive}
                  sx={{
                    borderRadius: '8px',
                    py: 1.25,
                    px: 2,
                    gap: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(45, 123, 149, 0.1)',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'rgba(45, 123, 149, 0.15)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                      '& .MuiListItemText-primary': {
                        fontWeight: 700,
                      },
                    },
                    '&:hover': {
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', color: isActive ? 'primary.main' : '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>

        {/* Settings & Profile - separated */}
        {(settingsItem || true) && (
          <>
            <Divider sx={{ my: 2 }} />
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0 }}>
              {settingsItem && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleItemClick(settingsItem.path)}
                    selected={location.pathname.startsWith(settingsItem.path)}
                    sx={{
                      borderRadius: '8px',
                      py: 1.25,
                      px: 2,
                      gap: 1.5,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(45, 123, 149, 0.1)',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(45, 123, 149, 0.15)' },
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                        '& .MuiListItemText-primary': { fontWeight: 700 },
                      },
                      '&:hover': { bgcolor: '#f8fafc' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 'auto', color: location.pathname.startsWith('/settings') ? 'primary.main' : '#64748b' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>settings</span>
                    </ListItemIcon>
                    <ListItemText
                      primary="הגדרות"
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: location.pathname.startsWith('/settings') ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick('/profile')}
                  selected={location.pathname === '/profile'}
                  sx={{
                    borderRadius: '8px',
                    py: 1.25,
                    px: 2,
                    gap: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(45, 123, 149, 0.1)',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'rgba(45, 123, 149, 0.15)' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                      '& .MuiListItemText-primary': { fontWeight: 700 },
                    },
                    '&:hover': { bgcolor: '#f8fafc' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', color: location.pathname === '/profile' ? 'primary.main' : '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>person</span>
                  </ListItemIcon>
                  <ListItemText
                    primary="פרופיל"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === '/profile' ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}
      </Box>

      {/* User Profile at Bottom */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(45, 123, 149, 0.05)',
            borderRadius: '12px',
            p: 1.5,
          }}
        >
          <Avatar
            src={user?.avatar}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              fontSize: '0.9375rem',
              fontWeight: 600,
            }}
          >
            {user?.firstName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.2,
              }}
              noWrap
            >
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                lineHeight: 1.2,
              }}
            >
              {user && getRoleText(user.role)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default Sidebar
