import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
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
  LinearProgress,
  Typography,
  Chip,
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
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectReport, EmployeeReport, Task } from '@/types'
import { formatDate } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import StatusChip from '@/components/StatusChip'
import PriorityChip from '@/components/PriorityChip'
import EmptyState from '@/components/EmptyState'
import { exportToPDF, exportToExcel, exportToCSV } from '@/utils/exportUtils'

const ReportsPage: React.FC = () => {
  const { user } = useAuth()
  const isClient = user?.role === 'CLIENT'

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

  // Open tasks
  const [openTasks, setOpenTasks] = useState<Task[]>([])
  const [openTasksSummary, setOpenTasksSummary] = useState<any>(null)

  const fetchOpenTasks = async () => {
    setLoading(true)
    try {
      const response = await api.get('/reports/open-tasks')
      const data = response.data.data
      setOpenTasks(data?.tasks || [])
      setOpenTasksSummary(data?.summary || null)
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

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
    else if (activeTab === 2 && !isClient) fetchEmployeePerformance()
    else if ((activeTab === 2 && isClient) || activeTab === 3) fetchOpenTasks()
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

  const thStyle = { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.875rem' }, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', mb: 0.5 }}>דוח שעות מפורט</Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, color: '#64748b' }}>צפייה וניתוח של פעילות השעות במערכת לפי חיתוכים שונים</Typography>
        </Box>
        {/* Export buttons */}
        {hoursData && activeTab === 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { label: 'PDF', icon: 'picture_as_pdf', color: '#2d7b95', handler: () => {
                const headers = ['פרויקט', 'שעות']
                const rows = Object.entries(hoursData.byProject || {}).map(([name, hrs]) => [name, Math.round(hrs * 10) / 10])
                exportToPDF('דוח שעות', headers, rows, 'hours-report')
              }},
              { label: 'Excel', icon: 'description', color: '#16a34a', handler: () => {
                const headers = ['פרויקט', 'שעות']
                const rows = Object.entries(hoursData.byProject || {}).map(([name, hrs]) => [name, Math.round(hrs * 10) / 10])
                exportToExcel('דוח שעות', headers, rows, 'hours-report')
              }},
              { label: 'CSV', icon: 'csv', color: '#64748b', handler: () => {
                const headers = ['פרויקט', 'שעות']
                const rows = Object.entries(hoursData.byProject || {}).map(([name, hrs]) => [name, Math.round(hrs * 10) / 10])
                exportToCSV(headers, rows, 'hours-report')
              }},
            ].map((btn) => (
              <Button
                key={btn.label}
                size="small"
                onClick={btn.handler}
                sx={{
                  px: 2, py: 1, borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500,
                  bgcolor: 'white', border: '1px solid #e2e8f0', color: '#334155',
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: btn.color, marginLeft: 8 }}>{btn.icon}</span>
                {btn.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 4,
          '& .MuiTab-root': { fontSize: '0.875rem', fontWeight: 600, minHeight: 48 },
          '& .Mui-selected': { color: '#2d7b95' },
          '& .MuiTabs-indicator': { bgcolor: '#2d7b95' },
        }}
      >
        <Tab label="דוח שעות" />
        <Tab label="סטטוס פרויקטים" />
        {!isClient && <Tab label="ביצועי עובדים" />}
        <Tab label="משימות פתוחות" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

      {/* Hours Report Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Filters */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>מתאריך</Typography>
              <DatePicker value={hoursStartDate} onChange={setHoursStartDate} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>עד תאריך</Typography>
              <DatePicker value={hoursEndDate} onChange={setHoursEndDate} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="contained" onClick={fetchHoursReport} fullWidth sx={{ bgcolor: '#2d7b95', py: 1, borderRadius: '8px', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' } }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>search</span>
                הצג דוח
              </Button>
            </Box>
          </Box>

          {hoursData && (
            <>
              {/* Summary Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
                {[
                  { label: 'סה"כ שעות', value: Math.round(hoursData.totalHours * 10) / 10, icon: 'schedule', iconBg: 'rgba(45,123,149,0.1)', iconColor: '#2d7b95' },
                  { label: 'פרויקטים', value: Object.keys(hoursData.byProject || {}).length, icon: 'folder', iconBg: '#dbeafe', iconColor: '#2563eb' },
                  { label: 'עובדים', value: Object.keys(hoursData.byEmployee || {}).length, icon: 'group', iconBg: '#f3e8ff', iconColor: '#7c3aed' },
                ].map((card) => (
                  <Card key={card.label} sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ width: 40, height: 40, bgcolor: card.iconBg, color: card.iconColor, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined">{card.icon}</span>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, mb: 0.5 }}>{card.label}</Typography>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.value}</Typography>
                  </Card>
                ))}
              </Box>

              {/* Chart */}
              {projectChartData.length > 0 && (
                <Card sx={{ p: 3, mb: 4, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', mb: 3 }}>התפלגות שעות לפי פרויקט</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip />
                      <Bar dataKey="hours" fill="#2d7b95" name="שעות" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
            <EmptyState title="אין נתוני פרויקטים" />
          ) : (
            <Grid container spacing={3}>
              {projectReports.map((pr) => (
                <Grid item xs={12} sm={6} md={4} key={pr.project.id}>
                  <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem' }} noWrap>{pr.project.name}</Typography>
                      <ProjectStatusChip status={pr.project.status} />
                    </Box>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>{pr.project.client}</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>השלמה</Typography>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{Math.round(pr.stats.completionPercentage)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pr.stats.completionPercentage} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95', borderRadius: 3 } }} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>סך משימות</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{pr.stats.totalTasks}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>הושלמו</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{pr.stats.completedTasks}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>שעות מתוכננות</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{pr.stats.estimatedHours || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>שעות בפועל</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{Math.round(pr.stats.actualHours * 10) / 10 || '-'}</Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Employee Performance Tab */}
      {activeTab === 2 && !isClient && (
        <Box>
          {!loading && employeeReports.length === 0 ? (
            <EmptyState title="אין נתוני עובדים" />
          ) : (
            <>
              <Card sx={{ mb: 4, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={thStyle}>שם עובד</TableCell>
                        <TableCell sx={thStyle}>סך שעות</TableCell>
                        <TableCell sx={thStyle}>סך משימות</TableCell>
                        <TableCell sx={thStyle}>הושלמו</TableCell>
                        <TableCell sx={thStyle}>אחוז השלמה</TableCell>
                        <TableCell sx={thStyle}>אחוז בזמן</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employeeReports.map((er) => (
                        <TableRow key={er.employee.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{er.employee.name}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(er.stats.totalHours * 10) / 10}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{er.stats.totalTasks}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{er.stats.completedTasks}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{Math.round(er.stats.completionPercentage)}%</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{Math.round(er.stats.onTimePercentage)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              {employeeChartData.length > 0 && (
                <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', mb: 3 }}>התפלגות שעות לפי עובד</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip />
                      <Bar dataKey="hours" fill="#2d7b95" name="שעות" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </Box>
      )}

      {/* Open Tasks Tab */}
      {((activeTab === 2 && isClient) || activeTab === 3) && (
        <Box>
          {openTasksSummary && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`סה"כ: ${openTasksSummary.total}`} sx={{ fontWeight: 600 }} />
              <Chip label={`חדשות: ${openTasksSummary.NEW}`} sx={{ bgcolor: 'rgba(45,123,149,0.15)', color: '#2d7b95', fontWeight: 600 }} />
              <Chip label={`בביצוע: ${openTasksSummary.IN_PROGRESS}`} sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }} />
              <Chip label={`ממתינות ללקוח: ${openTasksSummary.WAITING_CLIENT}`} sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 600 }} />
              <Chip label={`באיחור: ${openTasksSummary.overdue}`} sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 }} />
              <Box sx={{ flexGrow: 1 }} />
              {[
                { label: 'PDF', icon: 'picture_as_pdf', handler: () => {
                  const headers = ['כותרת', 'פרויקט', 'סטטוס', 'עדיפות', 'דדליין']
                  const rows = openTasks.map(t => [t.title, t.project?.name || '', t.status, t.priority, t.deadline ? formatDate(t.deadline) : '-'])
                  exportToPDF('משימות פתוחות', headers, rows, 'open-tasks')
                }},
                { label: 'Excel', icon: 'description', handler: () => {
                  const headers = ['כותרת', 'פרויקט', 'סטטוס', 'עדיפות', 'דדליין']
                  const rows = openTasks.map(t => [t.title, t.project?.name || '', t.status, t.priority, t.deadline ? formatDate(t.deadline) : '-'])
                  exportToExcel('משימות פתוחות', headers, rows, 'open-tasks')
                }},
                { label: 'CSV', icon: 'csv', handler: () => {
                  const headers = ['כותרת', 'פרויקט', 'סטטוס', 'עדיפות', 'דדליין']
                  const rows = openTasks.map(t => [t.title, t.project?.name || '', t.status, t.priority, t.deadline ? formatDate(t.deadline) : '-'])
                  exportToCSV(headers, rows, 'open-tasks')
                }},
              ].map((btn) => (
                <Button key={btn.label} size="small" onClick={btn.handler} sx={{ px: 2, py: 0.75, borderRadius: '8px', bgcolor: 'white', border: '1px solid #e2e8f0', color: '#334155', '&:hover': { bgcolor: '#f8fafc' } }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 4 }}>{btn.icon}</span>
                  {btn.label}
                </Button>
              ))}
            </Box>
          )}

          {!loading && openTasks.length === 0 ? (
            <EmptyState title="אין משימות פתוחות" subtitle="כל המשימות הושלמו!" />
          ) : (
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={thStyle}>כותרת</TableCell>
                      <TableCell sx={thStyle}>פרויקט</TableCell>
                      <TableCell sx={thStyle}>לקוח</TableCell>
                      <TableCell sx={thStyle}>סטטוס</TableCell>
                      <TableCell sx={thStyle}>עדיפות</TableCell>
                      <TableCell sx={thStyle}>דדליין</TableCell>
                      <TableCell sx={thStyle}>מוקצה ל</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {openTasks.map((task) => (
                      <TableRow key={task.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{task.title}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>{task.project?.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>{(task.project as any)?.client?.name || '-'}</TableCell>
                        <TableCell><StatusChip status={task.status} /></TableCell>
                        <TableCell><PriorityChip priority={task.priority} /></TableCell>
                        <TableCell>
                          {task.deadline ? (
                            <Typography sx={{ fontSize: '0.875rem', color: new Date(task.deadline) < new Date() ? '#ef4444' : '#64748b' }}>
                              {formatDate(task.deadline)}
                            </Typography>
                          ) : <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {task.assignedUsers?.length > 0
                            ? task.assignedUsers.map(a => a.user ? `${a.user.firstName} ${a.user.lastName}` : a.client?.name).join(', ')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ReportsPage
