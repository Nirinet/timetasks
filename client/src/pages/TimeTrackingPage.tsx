import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Tooltip,
  Typography,
  Chip,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import StopIcon from '@mui/icons-material/Stop'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import TimerIcon from '@mui/icons-material/Timer'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { TimeRecord, Task } from '@/types'
import { formatDate, formatTime, formatDuration } from '@/utils/formatters'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

const TimeTrackingPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  if (user?.role === 'CLIENT') {
    return (
      <Box>
        <PageHeader title="מעקב זמן" />
        <Alert severity="info">אין הרשאה לצפות בדף זה</Alert>
      </Box>
    )
  }

  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([])
  const [activeTimers, setActiveTimers] = useState<TimeRecord[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Manual entry dialog
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState({
    taskId: '',
    date: new Date() as Date | null,
    startTime: null as Date | null,
    endTime: null as Date | null,
    description: '',
  })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (startDate) params.startDate = startDate.toISOString().split('T')[0]
      if (endDate) params.endDate = endDate.toISOString().split('T')[0]

      const [recordsRes, activeRes] = await Promise.all([
        api.get('/time', { params }),
        api.get('/time/active'),
      ])

      const data = recordsRes.data.data
      setTimeRecords(data?.timeRecords || data?.items || data || [])
      setActiveTimers(activeRes.data.data?.activeTimers || activeRes.data.data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks')
      const data = response.data.data
      setTasks(data?.tasks || data?.items || data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchData()
    fetchTasks()
  }, [fetchData])

  const handleStopTimer = async (timerId: string) => {
    try {
      await api.post(`/time/stop/${timerId}`)
      toast.success('הטיימר נעצר')
      fetchData()
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleManualSubmit = async () => {
    if (!manualForm.taskId || !manualForm.date || !manualForm.startTime || !manualForm.endTime) {
      toast.error('יש למלא את כל שדות החובה')
      return
    }

    setSaving(true)
    try {
      const date = manualForm.date.toISOString().split('T')[0]
      const startTime = manualForm.startTime.toISOString()
      const endTime = manualForm.endTime.toISOString()

      await api.post('/time/manual', {
        taskId: manualForm.taskId,
        date,
        startTime,
        endTime,
        description: manualForm.description || undefined,
      })
      toast.success('רשומת הזמן נוספה בהצלחה')
      setManualOpen(false)
      setManualForm({ taskId: '', date: new Date(), startTime: null, endTime: null, description: '' })
      fetchData()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/time/${deleteId}`)
      toast.success('רשומת הזמן נמחקה')
      setDeleteId(null)
      fetchData()
    } catch {
      // error toast handled by api interceptor
    }
  }

  return (
    <Box>
      <PageHeader title="מעקב זמן" />

      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TimerIcon color="warning" />
              <Typography variant="h6">טיימרים פעילים ({activeTimers.length})</Typography>
            </Box>
            {activeTimers.map((timer) => (
              <Box
                key={timer.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={500}>{timer.task.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {timer.task.project?.name} • התחלה: {formatTime(timer.startTime)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<StopIcon />}
                  onClick={() => handleStopTimer(timer.id)}
                >
                  עצור
                </Button>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters & Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <DatePicker
          label="מתאריך"
          value={startDate}
          onChange={setStartDate}
          slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
        />
        <DatePicker
          label="עד תאריך"
          value={endDate}
          onChange={setEndDate}
          slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setManualOpen(true)}
        >
          הוספה ידנית
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Time Records Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {!loading && timeRecords.length === 0 ? (
            <EmptyState title="אין רשומות זמן" subtitle="התחל טיימר או הוסף רשומה ידנית" />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>תאריך</TableCell>
                    <TableCell>משימה</TableCell>
                    <TableCell>פרויקט</TableCell>
                    {isAdmin && <TableCell>עובד</TableCell>}
                    <TableCell>התחלה</TableCell>
                    <TableCell>סיום</TableCell>
                    <TableCell>משך</TableCell>
                    <TableCell>תיאור</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.task?.title}</TableCell>
                      <TableCell>{record.task?.project?.name}</TableCell>
                      {isAdmin && (
                        <TableCell>{record.employee?.firstName} {record.employee?.lastName}</TableCell>
                      )}
                      <TableCell>{formatTime(record.startTime)}</TableCell>
                      <TableCell>{record.endTime ? formatTime(record.endTime) : '-'}</TableCell>
                      <TableCell>{formatDuration(record.duration)}</TableCell>
                      <TableCell sx={{ maxWidth: 150 }}>
                        <Typography noWrap variant="body2">{record.description || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status === 'ACTIVE' ? 'פעיל' : record.status === 'COMPLETED' ? 'הושלם' : record.status}
                          size="small"
                          color={record.status === 'ACTIVE' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="מחיקה">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteId(record.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Manual Time Entry Dialog */}
      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>הוספת זמן ידנית</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="משימה"
              value={manualForm.taskId}
              onChange={(e) => setManualForm({ ...manualForm, taskId: e.target.value })}
              required
              fullWidth
            >
              {tasks.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.title} ({t.project?.name})
                </MenuItem>
              ))}
            </TextField>
            <DatePicker
              label="תאריך"
              value={manualForm.date}
              onChange={(date) => setManualForm({ ...manualForm, date })}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TimePicker
                label="שעת התחלה"
                value={manualForm.startTime}
                onChange={(time) => setManualForm({ ...manualForm, startTime: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={manualForm.endTime}
                onChange={(time) => setManualForm({ ...manualForm, endTime: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
            <TextField
              label="תיאור"
              value={manualForm.description}
              onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)}>ביטול</Button>
          <Button onClick={handleManualSubmit} variant="contained" disabled={saving}>
            {saving ? 'שומר...' : 'הוספה'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="מחיקת רשומת זמן"
        message="האם אתה בטוח שברצונך למחוק רשומת זמן זו?"
        confirmText="מחק"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  )
}

export default TimeTrackingPage
