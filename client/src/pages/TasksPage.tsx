import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Task, Project, User, Client, TaskStatus, Priority } from '@/types'
import { formatDate, formatDuration, getRoleLabel, formatFileSize } from '@/utils/formatters'
import StatusChip from '@/components/StatusChip'
import PriorityChip from '@/components/PriorityChip'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import KanbanBoard from '@/components/KanbanBoard'
import CalendarView from '@/components/CalendarView'
import GanttChart from '@/components/GanttChart'
import TeamView from '@/components/TeamView'

type ViewMode = 'table' | 'kanban' | 'calendar' | 'gantt' | 'team'

interface TaskFormData {
  title: string
  description: string
  projectId: string
  priority: Priority
  status: TaskStatus
  deadline: Date | null
  timeEstimate: string
  assignedUserIds: string[]
  assignedClientIds: string[]
}

const emptyForm: TaskFormData = {
  title: '',
  description: '',
  projectId: '',
  priority: 'NORMAL',
  status: 'NEW',
  deadline: null,
  timeEstimate: '',
  assignedUserIds: [],
  assignedClientIds: [],
}

const viewModes: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'table', label: 'טבלה', icon: 'table_rows' },
  { value: 'kanban', label: 'קנבן', icon: 'view_kanban' },
  { value: 'calendar', label: 'לוח שנה', icon: 'calendar_month' },
  { value: 'gantt', label: 'גאנט', icon: 'bar_chart' },
  { value: 'team', label: 'צוות', icon: 'groups' },
]

const TasksPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetail, setTaskDetail] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Delete & Clone
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  // Detail tabs
  const [detailTab, setDetailTab] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (filterProject) params.projectId = filterProject
      if (filterStatus) params.status = filterStatus
      if (filterPriority) params.priority = filterPriority
      const response = await api.get('/tasks', { params })
      const data = response.data.data
      setTasks(data?.tasks || data?.items || data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  const fetchDropdowns = async () => {
    try {
      const [projRes, userRes, clientRes] = await Promise.all([
        api.get('/projects'),
        isAdmin ? api.get('/users') : Promise.resolve({ data: { data: [] } }),
        isAdmin ? api.get('/clients') : Promise.resolve({ data: { data: [] } }),
      ])
      const projData = projRes.data.data
      setProjects(projData?.projects || projData?.items || projData || [])
      setUsers(userRes.data.data?.users || userRes.data.data || [])
      setClients(clientRes.data.data?.clients || clientRes.data.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filterProject, filterStatus, filterPriority])

  useEffect(() => {
    fetchDropdowns()
  }, [])

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedTask(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleEdit = (task: Task) => {
    setIsEditing(true)
    setSelectedTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      projectId: '',
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ? new Date(task.deadline) : null,
      timeEstimate: task.timeEstimate?.toString() || '',
      assignedUserIds: task.assignedUsers?.filter(a => a.userId).map(a => a.userId!) || [],
      assignedClientIds: task.assignedUsers?.filter(a => a.clientId).map(a => a.clientId!) || [],
    })
    setDialogOpen(true)
  }

  const handleViewDetail = async (task: Task) => {
    try {
      const response = await api.get(`/tasks/${task.id}`)
      setTaskDetail(response.data.data?.task || response.data.data)
      setDetailTab(0)
      setNewComment('')
      setDetailOpen(true)
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedTask(null)
    setForm(emptyForm)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('כותרת המשימה היא שדה חובה')
      return
    }
    if (!isEditing && !form.projectId) {
      toast.error('יש לבחור פרויקט')
      return
    }

    setSaving(true)
    try {
      if (isEditing && selectedTask) {
        await api.put(`/tasks/${selectedTask.id}`, {
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          status: form.status,
          deadline: form.deadline?.toISOString() || undefined,
          timeEstimate: form.timeEstimate ? parseFloat(form.timeEstimate) : undefined,
        })
        toast.success('המשימה עודכנה בהצלחה')
      } else {
        await api.post('/tasks', {
          title: form.title,
          description: form.description || undefined,
          projectId: form.projectId,
          priority: form.priority,
          deadline: form.deadline?.toISOString() || undefined,
          timeEstimate: form.timeEstimate ? parseFloat(form.timeEstimate) : undefined,
          assignedUserIds: form.assignedUserIds.length > 0 ? form.assignedUserIds : undefined,
          assignedClientIds: form.assignedClientIds.length > 0 ? form.assignedClientIds : undefined,
        })
        toast.success('המשימה נוצרה בהצלחה')
      }
      handleClose()
      fetchTasks()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskDetail) return
    setCommentSaving(true)
    try {
      await api.post('/comments', { content: newComment, taskId: taskDetail.id })
      setNewComment('')
      const response = await api.get(`/tasks/${taskDetail.id}`)
      setTaskDetail(response.data.data?.task || response.data.data)
      toast.success('התגובה נוספה בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setCommentSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !taskDetail) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taskId', taskDetail.id)
    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const response = await api.get(`/tasks/${taskDetail.id}`)
      setTaskDetail(response.data.data?.task || response.data.data)
      toast.success('הקובץ הועלה בהצלחה')
    } catch {
      // error toast handled by api interceptor
    }
    e.target.value = ''
  }

  const handleDelete = (task: Task) => {
    setTaskToDelete(task)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!taskToDelete) return
    try {
      await api.delete(`/tasks/${taskToDelete.id}`)
      toast.success('המשימה נמחקה בהצלחה')
      fetchTasks()
      if (detailOpen) setDetailOpen(false)
    } catch {
      // error toast handled by api interceptor
    } finally {
      setDeleteDialogOpen(false)
      setTaskToDelete(null)
    }
  }

  const handleClone = async (task: Task) => {
    try {
      await api.post(`/tasks/${task.id}/clone`)
      toast.success('המשימה שוכפלה בהצלחה')
      fetchTasks()
    } catch {
      // error toast handled by api interceptor
    }
  }

  // Compute stats
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const waitingCount = tasks.filter(t => t.status === 'WAITING_CLIENT').length

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, mb: 4, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.875rem' }, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
            {user?.role === 'CLIENT' ? 'המשימות שלי' : 'משימות'}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, color: '#64748b', mt: 0.5 }}>
            {user?.role === 'CLIENT' ? 'צפייה וניהול משימות המוקצות לפרויקטים שלך' : 'ניהול ומעקב אחר כל המשימות במערכת'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{
            bgcolor: '#2d7b95',
            fontWeight: 700,
            fontSize: '0.875rem',
            px: 2.5,
            py: 1.25,
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(45,123,149,0.3)',
            '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>add</span>
          משימה חדשה
        </Button>
      </Box>

      {/* Main Card with filters and view toggle */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', mb: 3 }}>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', p: 2, gap: 2 }}>
          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 0.5, bgcolor: '#f1f5f9', p: 0.5, borderRadius: '8px', overflowX: 'auto', flexShrink: 0 }}>
            {viewModes.map((vm) => (
              <Box
                key={vm.value}
                onClick={() => setViewMode(vm.value)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: { xs: 1.5, md: 2 },
                  py: 1,
                  whiteSpace: 'nowrap',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: viewMode === vm.value ? 700 : 500,
                  color: viewMode === vm.value ? '#2d7b95' : '#64748b',
                  bgcolor: viewMode === vm.value ? 'white' : 'transparent',
                  boxShadow: viewMode === vm.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s',
                  '&:hover': { color: viewMode === vm.value ? '#2d7b95' : '#334155' },
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{vm.icon}</span>
                <span>{vm.label}</span>
              </Box>
            ))}
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <TextField
              select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              size="small"
              sx={{
                minWidth: 160,
                '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' },
              }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">כל הפרויקטים</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              size="small"
              sx={{
                minWidth: 140,
                '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' },
              }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">כל הסטטוסים</MenuItem>
              <MenuItem value="NEW">חדש</MenuItem>
              <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
              <MenuItem value="WAITING_CLIENT">ממתין ללקוח</MenuItem>
              <MenuItem value="COMPLETED">הושלם</MenuItem>
            </TextField>
            <TextField
              select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              size="small"
              sx={{
                minWidth: 140,
                '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' },
              }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">כל העדיפויות</MenuItem>
              <MenuItem value="URGENT_IMPORTANT">דחוף וחשוב</MenuItem>
              <MenuItem value="IMPORTANT">חשוב</MenuItem>
              <MenuItem value="NORMAL">רגיל</MenuItem>
              <MenuItem value="LOW">נמוך</MenuItem>
            </TextField>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            {!loading && tasks.length === 0 ? (
              <EmptyState title="אין משימות" subtitle="הוסף משימה חדשה או שנה את הפילטרים" />
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem' }}>כותרת המשימה</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem' }}>פרויקט</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem', textAlign: 'center' }}>עדיפות</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem', textAlign: 'center' }}>סטטוס</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem' }}>מוקצה ל</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem' }}>דדליין</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.8125rem', textAlign: 'center' }}>פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        sx={{ '&:hover': { bgcolor: 'rgba(248,250,252,0.5)' }, cursor: 'pointer', transition: 'background 0.15s' }}
                      >
                        <TableCell onClick={() => handleViewDetail(task)} sx={{ maxWidth: 280 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>subject</span>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }} noWrap>{task.title}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>{task.project?.name}</Typography>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)} sx={{ textAlign: 'center' }}>
                          <PriorityChip priority={task.priority} />
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)} sx={{ textAlign: 'center' }}>
                          <StatusChip status={task.status} />
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            {task.assignedUsers?.length > 0
                              ? task.assignedUsers.map(a =>
                                  a.user ? `${a.user.firstName} ${a.user.lastName}` : a.client?.name
                                ).join(', ')
                              : '-'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          {task.deadline ? (
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                color: new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? '#ef4444' : '#64748b',
                              }}
                            >
                              {formatDate(task.deadline)}
                            </Typography>
                          ) : (
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="צפייה">
                              <IconButton size="small" onClick={() => handleViewDetail(task)} sx={{ color: '#2d7b95', '&:hover': { bgcolor: 'rgba(45,123,149,0.1)' } }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="עריכה">
                              <IconButton size="small" onClick={() => handleEdit(task)} sx={{ color: '#94a3b8', '&:hover': { color: '#64748b' } }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="שכפול">
                              <IconButton size="small" onClick={() => handleClone(task)} sx={{ color: '#94a3b8', '&:hover': { color: '#64748b' } }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>content_copy</span>
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="מחיקה">
                                <IconButton size="small" onClick={() => handleDelete(task)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <Box sx={{ p: 3, bgcolor: '#f6f7f8' }}>
            <KanbanBoard tasks={tasks} onTaskClick={handleViewDetail} onRefresh={fetchTasks} />
          </Box>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <Box sx={{ p: 3 }}>
            <CalendarView tasks={tasks} onTaskClick={handleViewDetail} />
          </Box>
        )}

        {/* Gantt View */}
        {viewMode === 'gantt' && (
          <Box sx={{ p: 3 }}>
            <GanttChart tasks={tasks} onTaskClick={handleViewDetail} />
          </Box>
        )}

        {/* Team View */}
        {viewMode === 'team' && (
          <Box sx={{ p: 3 }}>
            <TeamView tasks={tasks} onTaskClick={handleViewDetail} />
          </Box>
        )}
      </Card>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>pending_actions</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>משימות בביצוע</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{inProgressCount}</Typography>
          </Box>
        </Card>
        <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#ea580c' }}>hourglass_empty</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>ממתין לתגובה</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{waitingCount}</Typography>
          </Box>
        </Card>
        <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#059669' }}>check_circle</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>הושלמו</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{tasks.filter(t => t.status === 'COMPLETED').length}</Typography>
          </Box>
        </Card>
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
          {isEditing ? 'עריכת משימה' : 'הוספת משימה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="כותרת" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth size="small" />
            <TextField label="תיאור" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth size="small" />
            {!isEditing && (
              <TextField select label="פרויקט" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required fullWidth size="small">
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="עדיפות" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} fullWidth size="small">
                <MenuItem value="URGENT_IMPORTANT">דחוף וחשוב</MenuItem>
                <MenuItem value="IMPORTANT">חשוב</MenuItem>
                <MenuItem value="NORMAL">רגיל</MenuItem>
                <MenuItem value="LOW">נמוך</MenuItem>
              </TextField>
              {isEditing && (
                <TextField select label="סטטוס" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} fullWidth size="small">
                  <MenuItem value="NEW">חדש</MenuItem>
                  <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
                  <MenuItem value="WAITING_CLIENT">ממתין ללקוח</MenuItem>
                  <MenuItem value="COMPLETED">הושלם</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker label="דדליין" value={form.deadline} onChange={(date) => setForm({ ...form, deadline: date })} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
              <TextField label="הערכת זמן (שעות)" type="number" value={form.timeEstimate} onChange={(e) => setForm({ ...form, timeEstimate: e.target.value })} fullWidth size="small" />
            </Box>
            {!isEditing && isAdmin && users.length > 0 && (
              <TextField select label="הקצה לעובדים" value={form.assignedUserIds} onChange={(e) => setForm({ ...form, assignedUserIds: e.target.value as unknown as string[] })} fullWidth size="small" SelectProps={{ multiple: true }}>
                {users.filter(u => u.role !== 'CLIENT').map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={handleClose} sx={{ color: '#64748b' }}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={{ bgcolor: '#2d7b95', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' } }}>
            {saving ? 'שומר...' : isEditing ? 'עדכון' : 'יצירה'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        {taskDetail && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{taskDetail.title}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5 }}>
                    {taskDetail.project?.name} {taskDetail.project?.clients && taskDetail.project.clients.length > 0 && `• ${taskDetail.project.clients.map((pc: any) => pc.client.name).join(', ')}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <StatusChip status={taskDetail.status} />
                  <PriorityChip priority={taskDetail.priority} />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                sx={{
                  px: 3, borderBottom: '1px solid #f1f5f9',
                  '& .MuiTab-root': { fontSize: '0.875rem', fontWeight: 600, minHeight: 48 },
                  '& .Mui-selected': { color: '#2d7b95' },
                  '& .MuiTabs-indicator': { bgcolor: '#2d7b95' },
                }}
              >
                <Tab label="פרטים" />
                <Tab label={`תגובות (${taskDetail.comments?.length || 0})`} />
                <Tab label={`קבצים (${taskDetail.files?.length || 0})`} />
                <Tab label={`זמן (${taskDetail.timeRecords?.length || 0})`} />
              </Tabs>
              <Box sx={{ p: 3 }}>
                {detailTab === 0 && (
                  <Box>
                    {taskDetail.description && (
                      <Box sx={{ mb: 3 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>תיאור</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#334155' }}>{taskDetail.description}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 }, mb: 3 }}>
                      {taskDetail.deadline && (
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>דדליין</Typography>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{formatDate(taskDetail.deadline)}</Typography>
                        </Box>
                      )}
                      {taskDetail.timeEstimate != null && (
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>הערכת זמן</Typography>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{taskDetail.timeEstimate} שעות</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>תאריך יצירה</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{formatDate(taskDetail.creationDate)}</Typography>
                      </Box>
                    </Box>
                    {taskDetail.assignedUsers && taskDetail.assignedUsers.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>מוקצים</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {taskDetail.assignedUsers.map((a) => (
                            <Chip key={a.id} label={a.user ? `${a.user.firstName} ${a.user.lastName}` : a.client?.name} size="small" avatar={<Avatar sx={{ bgcolor: '#2d7b95' }}>{(a.user?.firstName || a.client?.name || '?')[0]}</Avatar>} sx={{ fontWeight: 500, fontSize: '0.8125rem' }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {taskDetail.subtasks && taskDetail.subtasks.length > 0 && (
                      <Box>
                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, mb: 1 }}>משימות משנה ({taskDetail.subtasks.length})</Typography>
                        <List dense>
                          {taskDetail.subtasks.map((st) => (
                            <ListItem key={st.id}><ListItemText primary={st.title} primaryTypographyProps={{ fontSize: '0.875rem' }} /><StatusChip status={st.status} /></ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
                {detailTab === 1 && (
                  <Box>
                    {taskDetail.comments && taskDetail.comments.length > 0 ? (
                      <List>
                        {taskDetail.comments.map((comment) => (
                          <React.Fragment key={comment.id}>
                            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                              <Avatar sx={{ ml: 2, bgcolor: '#2d7b95', width: 32, height: 32, fontSize: 14 }}>{comment.author.firstName[0]}</Avatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{comment.author.firstName} {comment.author.lastName}</Typography>
                                    <Chip label={getRoleLabel(comment.author.role)} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(comment.createdAt)}</Typography>
                                  </Box>
                                }
                                secondary={comment.content}
                                secondaryTypographyProps={{ sx: { whiteSpace: 'pre-wrap', mt: 0.5 } }}
                              />
                            </ListItem>
                            <Divider variant="inset" component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mb: 2 }}>אין תגובות עדיין</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <TextField fullWidth size="small" placeholder="הוסף תגובה..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()} />
                      <IconButton onClick={handleAddComment} disabled={!newComment.trim() || commentSaving} sx={{ color: '#2d7b95' }}>
                        <span className="material-symbols-outlined">send</span>
                      </IconButton>
                    </Box>
                  </Box>
                )}
                {detailTab === 2 && (
                  <Box>
                    {taskDetail.files && taskDetail.files.length > 0 ? (
                      <List dense>
                        {taskDetail.files.map((file) => (
                          <ListItem key={file.id} sx={{ px: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8', marginLeft: 8 }}>attach_file</span>
                            <ListItemText
                              primary={<Typography component="a" href={`/api/files/download/${file.id}`} target="_blank" sx={{ textDecoration: 'none', color: '#2d7b95', fontSize: '0.875rem', fontWeight: 500 }}>{file.originalName}</Typography>}
                              secondary={`${formatFileSize(file.size)} • ${file.uploadedBy.firstName} ${file.uploadedBy.lastName} • ${formatDate(file.createdAt)}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mb: 2 }}>אין קבצים מצורפים</Typography>
                    )}
                    <Button component="label" variant="outlined" sx={{ mt: 1, borderColor: '#e2e8f0', color: '#64748b', borderRadius: '8px', '&:hover': { borderColor: '#2d7b95', color: '#2d7b95' } }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>cloud_upload</span>
                      העלה קובץ
                      <input type="file" hidden onChange={handleFileUpload} />
                    </Button>
                  </Box>
                )}
                {detailTab === 3 && (
                  <Box>
                    {taskDetail.timeRecords && taskDetail.timeRecords.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.8125rem', color: '#64748b' }}>תאריך</TableCell>
                              <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.8125rem', color: '#64748b' }}>עובד</TableCell>
                              <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.8125rem', color: '#64748b' }}>משך</TableCell>
                              <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.8125rem', color: '#64748b' }}>תיאור</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {taskDetail.timeRecords.map((tr) => (
                              <TableRow key={tr.id}>
                                <TableCell sx={{ fontSize: '0.875rem' }}>{formatDate(tr.date)}</TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{tr.employee.firstName} {tr.employee.lastName}</TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(tr.duration)}</TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>{tr.description || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>אין רשומות זמן</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={() => { setDetailOpen(false); handleEdit(taskDetail) }} sx={{ color: '#64748b' }}>עריכה</Button>
              <Button onClick={() => setDetailOpen(false)} variant="contained" sx={{ bgcolor: '#2d7b95', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' } }}>סגור</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="מחיקת משימה"
        message={`האם למחוק את המשימה "${taskToDelete?.title}"? כל משימות המשנה והנתונים הקשורים יימחקו לצמיתות.`}
        confirmText="מחק"
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setTaskToDelete(null) }}
      />
    </Box>
  )
}

export default TasksPage
