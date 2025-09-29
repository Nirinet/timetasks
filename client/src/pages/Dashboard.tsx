import React from 'react'
import { Grid, Typography, Box } from '@mui/material'

import { useAuth } from '@/contexts/AuthContext'
import AdminDashboard from '@/components/Dashboard/AdminDashboard'
import EmployeeDashboard from '@/components/Dashboard/EmployeeDashboard'
import ClientDashboard from '@/components/Dashboard/ClientDashboard'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'בוקר טוב'
    if (hour < 18) return 'צהריים טובים'
    return 'ערב טוב'
  }

  const getRoleDisplay = (role: string) => {
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
    <Box>
      {/* Welcome Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {getGreeting()}, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {getRoleDisplay(user?.role || '')} • {new Date().toLocaleDateString('he-IL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Typography>
      </Box>

      {/* Role-based Dashboard Content */}
      {user?.role === 'ADMIN' && <AdminDashboard />}
      {user?.role === 'EMPLOYEE' && <EmployeeDashboard />}
      {user?.role === 'CLIENT' && <ClientDashboard />}
    </Box>
  )
}

export default Dashboard