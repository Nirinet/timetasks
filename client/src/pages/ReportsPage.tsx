import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Typography,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import AssessmentIcon from '@mui/icons-material/Assessment'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Project, User, ProjectReport, EmployeeReport } from '@/types'
import { formatDuration } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

const ReportsPage: React.FC = () => {
  const { user } = useAuth()

  if (user?.role === 'CLIENT') {
    return (
      <Box>
        <PageHeader title="דוחות" />
        <Alert severity="info">אין הרשאה לצפות בדף זה</Alert>
      </Box>
    )
  }

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)

  // Hours report
  const [hoursData, setHoursData] = useState<{ totalHours: number; byProject: Record<string, number>; byEmployee: Record<string, number> } | null>(null)
  const [hoursStartDate, setHoursStartDate] = useState<Date | null>(null)
  const [hoursEndDate, setHoursEndDate] = useState<Date | null>(null)

  // Project status
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([])

  // Employee performance
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([])

  const fetchHoursReport = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (hoursStartDate) params.startDate = hoursStartDate.toISOString().split('T')[0]
      if (hoursEndDate) params.endDate = hoursEndDate.toISOString().split('T')[0]
      const response = await api.get('/reports/hours', { params })
      const data = response.data.data
      setHoursData(data?.summary || data)
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectStatus = async () => {
    setLoading(true)
    try {
      const response = await api.get('/reports/project-status')
      const data = response.data.data
      setProjectReports(data?.projects || data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeePerformance = async () => {
    setLoading(true)
    try {
      const response = await api.get('/reports/employee-performance')
      const data = response.data.data
      setEmployeeReports(data?.employees || data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 0) fetchHoursReport()
    else if (activeTab === 1) fetchProjectStatus()
    else if (activeTab === 2) fetchEmployeePerformance()
  }, [activeTab])

  const projectChartData = hoursData?.byProject
    ? Object.entries(hoursData.byProject).map(([name, hours]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        hours: Math.round(hours * 10) / 10,
      }))
    : []

  const employeeChartData = employeeReports.map((er) => ({
    name: er.employee.name,
    hours: Math.round(er.stats.totalHours * 10) / 10,
  }))

  return (
    <Box>
      <PageHeader title="דוחות" />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="דוח שעות" />
        <Tab label="סטטוס פרויקטים" />
        <Tab label="ביצועי עובדים" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Hours Report Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <DatePicker
              label="מתאריך"
              value={hoursStartDate}
              onChange={setHoursStartDate}
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
            />
            <DatePicker
              label="עד תאריך"
              value={hoursEndDate}
              onChange={setHoursEndDate}
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
            />
            <Button variant="contained" onClick={fetchHoursReport} size="small">
              הצג דוח
            </Button>
          </Box>

          {hoursData && (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">סך שעות</Typography>
                      <Typography variant="h4" color="primary.main">
                        {Math.round(hoursData.totalHours * 10) / 10}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">פרויקטים</Typography>
                      <Typography variant="h4" color="primary.main">
                        {Object.keys(hoursData.byProject || {}).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">עובדים</Typography>
                      <Typography variant="h4" color="primary.main">
                        {Object.keys(hoursData.byEmployee || {}).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Chart */}
              {projectChartData.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>שעות לפי פרויקט</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={projectChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <RechartsTooltip />
                        <Bar dataKey="hours" fill="#1976d2" name="שעות" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}

      {/* Project Status Tab */}
      {activeTab === 1 && (
        <Box>
          {!loading && projectReports.length === 0 ? (
            <EmptyState icon={<AssessmentIcon />} title="אין נתוני פרויקטים" />
          ) : (
            <Grid container spacing={3}>
              {projectReports.map((pr) => (
                <Grid item xs={12} sm={6} md={4} key={pr.project.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                          {pr.project.name}
                        </Typography>
                        <ProjectStatusChip status={pr.project.status} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pr.project.client}
                      </Typography>

                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">השלמה</Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {Math.round(pr.stats.completionPercentage)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pr.stats.completionPercentage}
                          sx={{ height: 8, borderRadius: 4, mb: 2 }}
                        />
                      </Box>

                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">סך משימות</Typography>
                          <Typography variant="body2" fontWeight={500}>{pr.stats.totalTasks}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">הושלמו</Typography>
                          <Typography variant="body2" fontWeight={500}>{pr.stats.completedTasks}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">שעות מתוכננות</Typography>
                          <Typography variant="body2" fontWeight={500}>{pr.stats.estimatedHours || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">שעות בפועל</Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {Math.round(pr.stats.actualHours * 10) / 10 || '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Employee Performance Tab */}
      {activeTab === 2 && (
        <Box>
          {!loading && employeeReports.length === 0 ? (
            <EmptyState icon={<AssessmentIcon />} title="אין נתוני עובדים" />
          ) : (
            <>
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>שם עובד</TableCell>
                          <TableCell>סך שעות</TableCell>
                          <TableCell>סך משימות</TableCell>
                          <TableCell>הושלמו</TableCell>
                          <TableCell>אחוז השלמה</TableCell>
                          <TableCell>אחוז בזמן</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {employeeReports.map((er) => (
                          <TableRow key={er.employee.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{er.employee.name}</TableCell>
                            <TableCell>{Math.round(er.stats.totalHours * 10) / 10}</TableCell>
                            <TableCell>{er.stats.totalTasks}</TableCell>
                            <TableCell>{er.stats.completedTasks}</TableCell>
                            <TableCell>{Math.round(er.stats.completionPercentage)}%</TableCell>
                            <TableCell>{Math.round(er.stats.onTimePercentage)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {employeeChartData.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>שעות לפי עובד</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={employeeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="hours" fill="#1976d2" name="שעות" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ReportsPage
