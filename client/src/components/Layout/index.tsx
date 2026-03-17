import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
  InputBase,
  Divider,
} from '@mui/material'

import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationPanel from '@/components/NotificationPanel'

interface LayoutProps {
  children: React.ReactNode
}

const DRAWER_WIDTH = 256

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null)

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleProfileMenuClose = () => setAnchorEl(null)
  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => setNotificationAnchorEl(event.currentTarget)
  const handleNotificationClose = () => setNotificationAnchorEl(null)

  const handleLogout = () => {
    handleProfileMenuClose()
    logout()
  }

  const isMenuOpen = Boolean(anchorEl)
  const isNotificationOpen = Boolean(notificationAnchorEl)

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'מנהל מערכת'
      case 'EMPLOYEE': return 'עובד'
      case 'CLIENT': return 'לקוח'
      default: return role
    }
  }

  return (
    <Box sx={{ display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mr: { lg: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          height: 64,
        }}
        elevation={0}
      >
        <Toolbar sx={{ height: 64, px: { xs: 2, md: 3 }, gap: 2 }}>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="פתח תפריט"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { lg: 'none' } }}
          >
            <span className="material-symbols-outlined">menu</span>
          </IconButton>

          {/* Global Search */}
          <GlobalSearch />

          <Box sx={{ flexGrow: 1 }} />

          {/* Notifications */}
          <IconButton
            aria-label="הודעות"
            onClick={handleNotificationOpen}
            sx={{
              p: 1,
              borderRadius: '50%',
              color: '#64748b',
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            <Badge
              variant="dot"
              invisible={false}
              sx={{
                '& .MuiBadge-dot': {
                  top: 2,
                  right: 2,
                },
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            </Badge>
          </IconButton>

          {/* Divider */}
          <Box sx={{ width: '1px', height: 32, bgcolor: '#e2e8f0', mx: 0.5 }} />

          {/* User Profile */}
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              py: 0.5,
              px: 1,
              borderRadius: '8px',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
              <Typography
                sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}
                noWrap
              >
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography
                sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2 }}
              >
                {user && getRoleText(user.role)}
              </Typography>
            </Box>
            <Avatar
              src={user?.avatar}
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                border: '2px solid #e2e8f0',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}
            >
              {user?.firstName?.charAt(0)}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}
        aria-label="תפריט ניווט"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          anchor="right"
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderLeft: '1px solid',
              borderLeftColor: 'divider',
              borderRight: 'none',
            },
          }}
        >
          <Sidebar onItemClick={isMobile ? handleDrawerToggle : undefined} />
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 4 },
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'hidden',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ height: 64 }} />
        {children}
      </Box>

      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            mt: 1,
            minWidth: 160,
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => { handleProfileMenuClose(); navigate('/profile') }}
          sx={{ gap: 1.5, py: 1.5, fontSize: '0.875rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>person</span>
          פרופיל
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleLogout}
          sx={{ gap: 1.5, py: 1.5, fontSize: '0.875rem', color: 'error.main' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          התנתקות
        </MenuItem>
      </Menu>

      {/* Notification Panel */}
      <NotificationPanel
        anchorEl={notificationAnchorEl}
        open={isNotificationOpen}
        onClose={handleNotificationClose}
      />
    </Box>
  )
}

export default Layout
