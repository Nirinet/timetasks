import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Project, Client, ProjectStatus, Task } from '@/types'
import { formatDate } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import StatusChip from '@/components/StatusChip'
import PriorityChip from '@/components/PriorityChip'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

interface ProjectFormData {
  name: string
  description: string
  clientId: string
  startDate: Date | null
  targetDate: Date | null
  hoursBudget: string
  status: ProjectStatus
}

const emptyForm: ProjectFormData = {
  name: '',
  description: '',
  clientId: '',
  startDate: new Date(),
  targetDate: null,
  hoursBudget: '',
  status: 'ACTIVE',
}

const ProjectsPage: React.FC = () => {
  const { user } = useAuth()
  const isClient = user?.role === 'CLIENT'

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/projects', { params })
      const data = response.data.data
      setProjects(data?.projects || data?.items || data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients')
      setClients(response.data.data?.clients || response.data.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchProjects()
    if (!isClient) fetchClients()
  }, [statusFilter])

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedProject(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleEdit = (project: Project) => {
    setIsEditing(true)
    setSelectedProject(project)
    setForm({
      name: project.name,
      description: project.description || '',
      clientId: project.client.id,
      startDate: new Date(project.startDate),
      targetDate: project.targetDate ? new Date(project.targetDate) : null,
      hoursBudget: project.hoursBudget?.toString() || '',
      status: project.status,
    })
    setDialogOpen(true)
  }

  const handleViewDetail = async (project: Project) => {
    try {
      const response = await api.get(`/projects/${project.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      setDetailDialogOpen(true)
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedProject(null)
    setForm(emptyForm)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.clientId) {
      toast.error('שם פרויקט ולקוח הם שדות חובה')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        clientId: form.clientId,
        startDate: form.startDate?.toISOString(),
        targetDate: form.targetDate?.toISOString() || undefined,
        hoursBudget: form.hoursBudget ? parseFloat(form.hoursBudget) : undefined,
      }

      if (isEditing && selectedProject) {
        payload.status = form.status
        await api.put(`/projects/${selectedProject.id}`, payload)
        toast.success('הפרויקט עודכן בהצלחה')
      } else {
        await api.post('/projects', payload)
        toast.success('הפרויקט נוצר בהצלחה')
      }
      handleClose()
      fetchProjects()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  const statusOptions: { value: ProjectStatus | ''; label: string }[] = [
    { value: '', label: 'הכל' },
    { value: 'ACTIVE', label: 'פעיל' },
    { value: 'ON_HOLD', label: 'מושהה' },
    { value: 'COMPLETED', label: 'הושלם' },
  ]

  return (
    <Box>
      <PageHeader
        title="פרויקטים"
        actionLabel={!isClient ? 'הוסף פרויקט' : undefined}
        onAction={!isClient ? handleCreate : undefined}
      />

      {/* Status Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {statusOptions.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            onClick={() => setStatusFilter(opt.value)}
            color={statusFilter === opt.value ? 'primary' : 'default'}
            variant={statusFilter === opt.value ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!loading && projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon />}
          title="אין פרויקטים"
          subtitle={statusFilter ? 'אין פרויקטים בסטטוס שנבחר' : 'הוסף פרויקט חדש כדי להתחיל'}
        />
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => handleViewDetail(project)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                      {project.name}
                    </Typography>
                    <ProjectStatusChip status={project.status} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {project.client?.name}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mb: 1,
                    }}>
                      {project.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      התחלה: {formatDate(project.startDate)}
                    </Typography>
                    {project.targetDate && (
                      <Typography variant="caption" color="text.secondary">
                        יעד: {formatDate(project.targetDate)}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Chip label={`${project._count?.tasks || 0} משימות`} size="small" variant="outlined" />
                    {project.hoursBudget != null && (
                      <Chip label={`${project.hoursBudget} שעות`} size="small" variant="outlined" />
                    )}
                  </Box>
                </CardContent>
                {!isClient && (
                  <CardActions>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(project)
                      }}
                    >
                      עריכה
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'עריכת פרויקט' : 'הוספת פרויקט חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="שם פרויקט"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <TextField
              select
              label="לקוח"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              required
              fullWidth
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="תאריך התחלה"
                value={form.startDate}
                onChange={(date) => setForm({ ...form, startDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="תאריך יעד"
                value={form.targetDate}
                onChange={(date) => setForm({ ...form, targetDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
            <TextField
              label="תקציב שעות"
              type="number"
              value={form.hoursBudget}
              onChange={(e) => setForm({ ...form, hoursBudget: e.target.value })}
              fullWidth
            />
            {isEditing && (
              <TextField
                select
                label="סטטוס"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                fullWidth
              >
                <MenuItem value="ACTIVE">פעיל</MenuItem>
                <MenuItem value="ON_HOLD">מושהה</MenuItem>
                <MenuItem value="COMPLETED">הושלם</MenuItem>
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

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {detailProject && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">{detailProject.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailProject.client?.name}
                  </Typography>
                </Box>
                <ProjectStatusChip status={detailProject.status} size="medium" />
              </Box>
            </DialogTitle>
            <DialogContent>
              {detailProject.description && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {detailProject.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">תאריך התחלה</Typography>
                  <Typography>{formatDate(detailProject.startDate)}</Typography>
                </Box>
                {detailProject.targetDate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">תאריך יעד</Typography>
                    <Typography>{formatDate(detailProject.targetDate)}</Typography>
                  </Box>
                )}
                {detailProject.hoursBudget != null && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">תקציב שעות</Typography>
                    <Typography>{detailProject.hoursBudget}</Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                משימות ({detailProject.tasks?.length || 0})
              </Typography>
              {detailProject.tasks && detailProject.tasks.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>כותרת</TableCell>
                        <TableCell>סטטוס</TableCell>
                        <TableCell>עדיפות</TableCell>
                        <TableCell>דדליין</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailProject.tasks.map((task: Task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.title}</TableCell>
                          <TableCell><StatusChip status={task.status} /></TableCell>
                          <TableCell><PriorityChip priority={task.priority} /></TableCell>
                          <TableCell>{formatDate(task.deadline)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  אין משימות בפרויקט זה
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              {!isClient && (
                <Button
                  onClick={() => {
                    setDetailDialogOpen(false)
                    handleEdit(detailProject)
                  }}
                >
                  עריכה
                </Button>
              )}
              <Button onClick={() => setDetailDialogOpen(false)} variant="contained">
                סגור
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default ProjectsPage
