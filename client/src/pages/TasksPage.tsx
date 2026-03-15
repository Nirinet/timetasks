import React, { useState, useEffect } from 'react'
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CommentIcon from '@mui/icons-material/Comment'
import SendIcon from '@mui/icons-material/Send'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import TableChartIcon from '@mui/icons-material/TableChart'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import BarChartIcon from '@mui/icons-material/BarChart'
import GroupsIcon from '@mui/icons-material/Groups'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Task, Project, User, Client, TaskStatus, Priority } from '@/types'
import { formatDate, formatDuration, getRoleLabel, formatFileSize } from '@/utils/formatters'
import StatusChip from '@/components/StatusChip'
import PriorityChip from '@/components/PriorityChip'
import PageHeader from '@/components/PageHeader'
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
      // Refresh task detail
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
      // Refresh task detail
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

  return (
    <Box>
      <PageHeader title="משימות" actionLabel="הוסף משימה" onAction={handleCreate} />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="פרויקט"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">הכל</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="סטטוס"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">הכל</MenuItem>
          <MenuItem value="NEW">חדש</MenuItem>
          <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
          <MenuItem value="WAITING_CLIENT">ממתין ללקוח</MenuItem>
          <MenuItem value="COMPLETED">הושלם</MenuItem>
        </TextField>
        <TextField
          select
          label="עדיפות"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">הכל</MenuItem>
          <MenuItem value="URGENT_IMPORTANT">דחוף וחשוב</MenuItem>
          <MenuItem value="IMPORTANT">חשוב</MenuItem>
          <MenuItem value="NORMAL">רגיל</MenuItem>
          <MenuItem value="LOW">נמוך</MenuItem>
        </TextField>
      </Box>

      {/* View Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {loading && <LinearProgress sx={{ flex: 1, ml: 2 }} />}
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v as ViewMode)}
          size="small"
        >
          <ToggleButton value="table">
            <Tooltip title="טבלה"><TableChartIcon fontSize="small" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="kanban">
            <Tooltip title="קנבן"><ViewKanbanIcon fontSize="small" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="calendar">
            <Tooltip title="לוח שנה"><CalendarMonthIcon fontSize="small" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="gantt">
            <Tooltip title="גאנט"><BarChartIcon fontSize="small" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="team">
            <Tooltip title="צוות"><GroupsIcon fontSize="small" /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {!loading && tasks.length === 0 ? (
              <EmptyState title="אין משימות" subtitle="הוסף משימה חדשה או שנה את הפילטרים" />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>כותרת</TableCell>
                      <TableCell>פרויקט</TableCell>
                      <TableCell>סטטוס</TableCell>
                      <TableCell>עדיפות</TableCell>
                      <TableCell>מוקצה ל</TableCell>
                      <TableCell>דדליין</TableCell>
                      <TableCell>פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell
                          sx={{ fontWeight: 500, maxWidth: 250 }}
                          onClick={() => handleViewDetail(task)}
                        >
                          <Typography noWrap>{task.title}</Typography>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          {task.project?.name}
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          <StatusChip status={task.status} />
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          <PriorityChip priority={task.priority} />
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          {task.assignedUsers?.length > 0
                            ? task.assignedUsers.map(a =>
                                a.user ? `${a.user.firstName} ${a.user.lastName}` : a.client?.name
                              ).join(', ')
                            : '-'
                          }
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(task)}>
                          {task.deadline ? (
                            <Typography
                              variant="body2"
                              color={new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? 'error' : 'inherit'}
                            >
                              {formatDate(task.deadline)}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="צפייה">
                            <IconButton size="small" onClick={() => handleViewDetail(task)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="עריכה">
                            <IconButton size="small" onClick={() => handleEdit(task)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="שכפול">
                            <IconButton size="small" onClick={() => handleClone(task)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip title="מחיקה">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(task)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <KanbanBoard tasks={tasks} onTaskClick={handleViewDetail} onRefresh={fetchTasks} />
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView tasks={tasks} onTaskClick={handleViewDetail} />
      )}

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <GanttChart tasks={tasks} onTaskClick={handleViewDetail} />
      )}

      {/* Team View */}
      {viewMode === 'team' && (
        <TeamView tasks={tasks} onTaskClick={handleViewDetail} />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'עריכת משימה' : 'הוספת משימה חדשה'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="כותרת"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="תיאור"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            {!isEditing && (
              <TextField
                select
                label="פרויקט"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                required
                fullWidth
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="עדיפות"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                fullWidth
              >
                <MenuItem value="URGENT_IMPORTANT">דחוף וחשוב</MenuItem>
                <MenuItem value="IMPORTANT">חשוב</MenuItem>
                <MenuItem value="NORMAL">רגיל</MenuItem>
                <MenuItem value="LOW">נמוך</MenuItem>
              </TextField>
              {isEditing && (
                <TextField
                  select
                  label="סטטוס"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                  fullWidth
                >
                  <MenuItem value="NEW">חדש</MenuItem>
                  <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
                  <MenuItem value="WAITING_CLIENT">ממתין ללקוח</MenuItem>
                  <MenuItem value="COMPLETED">הושלם</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="דדליין"
                value={form.deadline}
                onChange={(date) => setForm({ ...form, deadline: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TextField
                label="הערכת זמן (שעות)"
                type="number"
                value={form.timeEstimate}
                onChange={(e) => setForm({ ...form, timeEstimate: e.target.value })}
                fullWidth
              />
            </Box>
            {!isEditing && isAdmin && users.length > 0 && (
              <TextField
                select
                label="הקצה לעובדים"
                value={form.assignedUserIds}
                onChange={(e) => setForm({ ...form, assignedUserIds: e.target.value as unknown as string[] })}
                fullWidth
                SelectProps={{ multiple: true }}
              >
                {users.filter(u => u.role !== 'CLIENT').map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? 'שומר...' : isEditing ? 'עדכון' : 'יצירה'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {taskDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6">{taskDetail.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {taskDetail.project?.name} {taskDetail.project?.clients && taskDetail.project.clients.length > 0 && `• ${taskDetail.project.clients.map(pc => pc.client.name).join(', ')}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <StatusChip status={taskDetail.status} />
                  <PriorityChip priority={taskDetail.priority} />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label="פרטים" />
                <Tab label={`תגובות (${taskDetail.comments?.length || 0})`} />
                <Tab label={`קבצים (${taskDetail.files?.length || 0})`} />
                <Tab label={`זמן (${taskDetail.timeRecords?.length || 0})`} />
              </Tabs>

              {/* Details Tab */}
              {detailTab === 0 && (
                <Box>
                  {taskDetail.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">תיאור</Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{taskDetail.description}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
                    {taskDetail.deadline && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">דדליין</Typography>
                        <Typography>{formatDate(taskDetail.deadline)}</Typography>
                      </Box>
                    )}
                    {taskDetail.timeEstimate != null && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">הערכת זמן</Typography>
                        <Typography>{taskDetail.timeEstimate} שעות</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body2" color="text.secondary">תאריך יצירה</Typography>
                      <Typography>{formatDate(taskDetail.creationDate)}</Typography>
                    </Box>
                  </Box>
                  {taskDetail.assignedUsers && taskDetail.assignedUsers.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>מוקצים</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {taskDetail.assignedUsers.map((a) => (
                          <Chip
                            key={a.id}
                            label={a.user ? `${a.user.firstName} ${a.user.lastName}` : a.client?.name}
                            size="small"
                            avatar={<Avatar>{(a.user?.firstName || a.client?.name || '?')[0]}</Avatar>}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {taskDetail.subtasks && taskDetail.subtasks.length > 0 && (
                    <Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>משימות משנה ({taskDetail.subtasks.length})</Typography>
                      <List dense>
                        {taskDetail.subtasks.map((st) => (
                          <ListItem key={st.id}>
                            <ListItemText primary={st.title} />
                            <StatusChip status={st.status} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}

              {/* Comments Tab */}
              {detailTab === 1 && (
                <Box>
                  {taskDetail.comments && taskDetail.comments.length > 0 ? (
                    <List>
                      {taskDetail.comments.map((comment) => (
                        <React.Fragment key={comment.id}>
                          <ListItem alignItems="flex-start">
                            <Avatar sx={{ ml: 2, bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                              {comment.author.firstName[0]}
                            </Avatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Typography variant="subtitle2">
                                    {comment.author.firstName} {comment.author.lastName}
                                  </Typography>
                                  <Chip label={getRoleLabel(comment.author.role)} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(comment.createdAt)}
                                  </Typography>
                                </Box>
                              }
                              secondary={comment.content}
                            />
                          </ListItem>
                          <Divider variant="inset" component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      אין תגובות עדיין
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="הוסף תגובה..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || commentSaving}
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Files Tab */}
              {detailTab === 2 && (
                <Box>
                  {taskDetail.files && taskDetail.files.length > 0 ? (
                    <List dense>
                      {taskDetail.files.map((file) => (
                        <ListItem key={file.id}>
                          <AttachFileIcon sx={{ ml: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary={
                              <Typography
                                component="a"
                                href={`/api/files/download/${file.id}`}
                                target="_blank"
                                sx={{ textDecoration: 'none', color: 'primary.main' }}
                              >
                                {file.originalName}
                              </Typography>
                            }
                            secondary={`${formatFileSize(file.size)} • ${file.uploadedBy.firstName} ${file.uploadedBy.lastName} • ${formatDate(file.createdAt)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      אין קבצים מצורפים
                    </Typography>
                  )}
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mt: 1 }}
                  >
                    העלה קובץ
                    <input type="file" hidden onChange={handleFileUpload} />
                  </Button>
                </Box>
              )}

              {/* Time Records Tab */}
              {detailTab === 3 && (
                <Box>
                  {taskDetail.timeRecords && taskDetail.timeRecords.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>תאריך</TableCell>
                            <TableCell>עובד</TableCell>
                            <TableCell>משך</TableCell>
                            <TableCell>תיאור</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {taskDetail.timeRecords.map((tr) => (
                            <TableRow key={tr.id}>
                              <TableCell>{formatDate(tr.date)}</TableCell>
                              <TableCell>{tr.employee.firstName} {tr.employee.lastName}</TableCell>
                              <TableCell>{formatDuration(tr.duration)}</TableCell>
                              <TableCell>{tr.description || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      אין רשומות זמן
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setDetailOpen(false); handleEdit(taskDetail) }}>
                עריכה
              </Button>
              <Button onClick={() => setDetailOpen(false)} variant="contained">
                סגור
              </Button>
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
