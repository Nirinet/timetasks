import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Typography,
  Tabs,
  Tab,
  Avatar,
  AvatarGroup,
  Autocomplete,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Project, Client, User, ProjectStatus, Task, Comment, ProjectAssignment, ProjectClientEntry } from '@/types'
import { formatDate } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import StatusChip from '@/components/StatusChip'
import PriorityChip from '@/components/PriorityChip'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ProjectFormData {
  name: string
  description: string
  clientIds: string[]
  startDate: Date | null
  targetDate: Date | null
  hoursBudget: string
  status: ProjectStatus
}

const emptyForm: ProjectFormData = {
  name: '',
  description: '',
  clientIds: [],
  startDate: new Date(),
  targetDate: null,
  hoursBudget: '',
  status: 'ACTIVE',
}

// Helper: get comma-separated client names from project
const getClientNames = (project: Project): string =>
  project.clients?.map(pc => pc.client.name).join(', ') || ''

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
  ON_HOLD: { bg: '#fefce8', text: '#ca8a04', dot: '#eab308' },
  COMPLETED: { bg: '#f0f9ff', text: '#0284c7', dot: '#0ea5e9' },
}

const roleColors: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: '#fee2e2', text: '#dc2626' },
  EMPLOYEE: { bg: '#dbeafe', text: '#2563eb' },
}

const thStyle = {
  px: 3,
  py: 2,
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'right' as const,
}

const tdStyle = {
  px: 3,
  py: 2,
  fontSize: '0.875rem',
  borderBottom: '1px solid #f1f5f9',
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<User[]>([])
  const [savingMembers, setSavingMembers] = useState(false)
  const [selectedClientsToAdd, setSelectedClientsToAdd] = useState<Client[]>([])
  const [savingClients, setSavingClients] = useState(false)

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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setAllUsers(response.data.data?.users || response.data.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchProjects()
    if (!isClient) {
      fetchClients()
      fetchUsers()
    }
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
      clientIds: project.clients?.map(pc => pc.client.id) || [],
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
      setDetailTab(0)
      setNewComment('')
      setDetailDialogOpen(true)
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !detailProject) return
    setSendingComment(true)
    try {
      await api.post('/comments', {
        content: newComment.trim(),
        projectId: detailProject.id,
      })
      setNewComment('')
      const response = await api.get(`/projects/${detailProject.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      toast.success('תגובה נוספה בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSendingComment(false)
    }
  }

  const handleAddMembers = async () => {
    if (!detailProject || selectedUsersToAdd.length === 0) return
    setSavingMembers(true)
    try {
      await api.post(`/projects/${detailProject.id}/members`, {
        userIds: selectedUsersToAdd.map(u => u.id),
      })
      setSelectedUsersToAdd([])
      const response = await api.get(`/projects/${detailProject.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      toast.success('משתמשים שויכו לפרויקט בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSavingMembers(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!detailProject) return
    try {
      await api.delete(`/projects/${detailProject.id}/members/${userId}`)
      const response = await api.get(`/projects/${detailProject.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      toast.success('המשתמש הוסר מהפרויקט')
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleAddClients = async () => {
    if (!detailProject || selectedClientsToAdd.length === 0) return
    setSavingClients(true)
    try {
      await api.post(`/projects/${detailProject.id}/clients`, {
        clientIds: selectedClientsToAdd.map(c => c.id),
      })
      setSelectedClientsToAdd([])
      const response = await api.get(`/projects/${detailProject.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      toast.success('לקוחות שויכו לפרויקט בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSavingClients(false)
    }
  }

  const handleRemoveClient = async (clientId: string) => {
    if (!detailProject) return
    try {
      await api.delete(`/projects/${detailProject.id}/clients/${clientId}`)
      const response = await api.get(`/projects/${detailProject.id}`)
      setDetailProject(response.data.data?.project || response.data.data)
      toast.success('הלקוח הוסר מהפרויקט')
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleDelete = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return
    try {
      await api.delete(`/projects/${projectToDelete.id}`)
      toast.success('הפרויקט נמחק בהצלחה')
      fetchProjects()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedProject(null)
    setForm(emptyForm)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || form.clientIds.length === 0) {
      toast.error('שם פרויקט ולקוח אחד לפחות הם שדות חובה')
      return
    }

    setSaving(true)
    try {
      if (isEditing && selectedProject) {
        const payload: Record<string, unknown> = {
          name: form.name,
          description: form.description || undefined,
          startDate: form.startDate?.toISOString(),
          targetDate: form.targetDate?.toISOString() || undefined,
          hoursBudget: form.hoursBudget ? parseFloat(form.hoursBudget) : undefined,
          status: form.status,
        }
        await api.put(`/projects/${selectedProject.id}`, payload)
        toast.success('הפרויקט עודכן בהצלחה')
      } else {
        const payload: Record<string, unknown> = {
          name: form.name,
          description: form.description || undefined,
          clientIds: form.clientIds,
          startDate: form.startDate?.toISOString(),
          targetDate: form.targetDate?.toISOString() || undefined,
          hoursBudget: form.hoursBudget ? parseFloat(form.hoursBudget) : undefined,
        }
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

  // Compute summary stats
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length
  const onHoldCount = projects.filter(p => p.status === 'ON_HOLD').length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, mb: 4, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.875rem' }, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
            פרויקטים
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, color: '#64748b', mt: 0.5 }}>
            ניהול פרויקטים, משימות וצוותי עבודה
          </Typography>
        </Box>
        {!isClient && (
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{
              bgcolor: '#2d7b95',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 2.5,
              py: 1,
              borderRadius: '8px',
              boxShadow: '0 1px 2px 0 rgba(45,123,149,0.2)',
              '&:hover': { bgcolor: 'rgba(45,123,149,0.9)', boxShadow: '0 4px 6px -1px rgba(45,123,149,0.3)' },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, marginLeft: 8 }}>add</span>
            פרויקט חדש
          </Button>
        )}
      </Box>

      {/* Status Filter */}
      <Card sx={{ mb: 3, p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'contained' : 'text'}
              size="small"
              onClick={() => setStatusFilter(opt.value)}
              sx={{
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8125rem',
                px: 2,
                py: 0.75,
                ...(statusFilter === opt.value
                  ? { bgcolor: '#2d7b95', color: '#fff', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' } }
                  : { color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }),
              }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>
      </Card>

      {loading && <LinearProgress sx={{ mb: 3, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

      {!loading && projects.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>folder_open</span>}
          title="אין פרויקטים"
          subtitle={statusFilter ? 'אין פרויקטים בסטטוס שנבחר' : 'הוסף פרויקט חדש כדי להתחיל'}
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {projects.map((project) => {
            const sc = statusColors[project.status] || statusColors.ACTIVE
            const taskCount = project._count?.tasks || 0
            const isOverdue = project.targetDate && new Date(project.targetDate) < new Date() && project.status !== 'COMPLETED'

            return (
              <Card
                key={project.id}
                onClick={() => handleViewDetail(project)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'rgba(45,123,149,0.3)', boxShadow: '0 4px 12px rgba(45,123,149,0.1)' },
                }}
              >
                <Box sx={{ p: 3, flexGrow: 1 }}>
                  {/* Header: Icon + Name + Status */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '10px',
                      bgcolor: 'rgba(45,123,149,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#2d7b95' }}>web</span>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontWeight: 700, fontSize: '1rem', color: '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.25 }}>
                        {getClientNames(project) || '---'}
                      </Typography>
                    </Box>
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                      px: 1.5, py: 0.5, borderRadius: '9999px',
                      fontSize: '0.6875rem', fontWeight: 700,
                      bgcolor: sc.bg, color: sc.text,
                    }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc.dot }} />
                      {project.status === 'ACTIVE' ? 'פעיל' : project.status === 'ON_HOLD' ? 'מושהה' : 'הושלם'}
                    </Box>
                  </Box>

                  {/* Description */}
                  {project.description && (
                    <Typography sx={{
                      fontSize: '0.8125rem', color: '#64748b', mb: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {project.description}
                    </Typography>
                  )}

                  {/* Stats Row */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{taskCount} משימות</Typography>
                    </Box>
                    {project.hoursBudget != null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{project.hoursBudget} שעות</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Dates */}
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#94a3b8' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                      <Typography sx={{ fontSize: '0.6875rem' }}>{formatDate(project.startDate)}</Typography>
                    </Box>
                    {project.targetDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {isOverdue ? 'event_busy' : 'event'}
                        </span>
                        <Typography sx={{ fontSize: '0.6875rem', fontWeight: isOverdue ? 700 : 400 }}>
                          {formatDate(project.targetDate)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Card Footer */}
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  px: 3, py: 2, borderTop: '1px solid #f1f5f9',
                }}>
                  {project.assignedUsers && project.assignedUsers.length > 0 ? (
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.7rem', border: '2px solid white', bgcolor: '#2d7b95' } }}>
                      {project.assignedUsers.map((a) => (
                        <Avatar key={a.user.id} title={`${a.user.firstName} ${a.user.lastName}`}>
                          {a.user.firstName.charAt(0)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  ) : (
                    <Box />
                  )}

                  {!isClient && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEdit(project) }}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, borderRadius: '8px', border: 'none',
                          bgcolor: 'transparent', cursor: 'pointer', color: '#94a3b8',
                          '&:hover': { bgcolor: '#f1f5f9', color: '#2d7b95' },
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                      </Box>
                      <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(project) }}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, borderRadius: '8px', border: 'none',
                          bgcolor: 'transparent', cursor: 'pointer', color: '#94a3b8',
                          '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' },
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Card>
            )
          })}
        </Box>
      )}

      {/* Summary Cards */}
      {!loading && projects.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
          <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#22c55e' }}>rocket_launch</span>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{activeCount}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>פרויקטים פעילים</Typography>
              </Box>
            </Box>
          </Card>
          <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#eab308' }}>pause_circle</span>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{onHoldCount}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>פרויקטים מושהים</Typography>
              </Box>
            </Box>
          </Card>
          <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#0ea5e9' }}>check_circle</span>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{completedCount}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>פרויקטים שהושלמו</Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px',
              bgcolor: 'rgba(45,123,149,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#2d7b95' }}>
                {isEditing ? 'edit_note' : 'add_circle'}
              </span>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a' }}>
                {isEditing ? 'עריכת פרויקט' : 'הוספת פרויקט חדש'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {isEditing ? 'עדכון פרטי הפרויקט' : 'מלא את פרטי הפרויקט החדש'}
              </Typography>
            </Box>
          </Box>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="שם פרויקט"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="תיאור"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              size="small"
            />
            {!isEditing && (
              <Autocomplete
                multiple
                options={clients}
                getOptionLabel={(c) => c.name}
                value={clients.filter(c => form.clientIds.includes(c.id))}
                onChange={(_, val) => setForm({ ...form, clientIds: val.map(c => c.id) })}
                renderInput={(params) => (
                  <TextField {...params} label="לקוחות" required size="small" />
                )}
                noOptionsText="אין לקוחות"
              />
            )}
            {isEditing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>info</span>
                <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  ניהול לקוחות מתבצע דרך לשונית &quot;לקוחות&quot; בפרטי הפרויקט
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="תאריך התחלה"
                value={form.startDate}
                onChange={(date) => setForm({ ...form, startDate: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <DatePicker
                label="תאריך יעד"
                value={form.targetDate}
                onChange={(date) => setForm({ ...form, targetDate: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Box>
            <TextField
              label="תקציב שעות"
              type="number"
              value={form.hoursBudget}
              onChange={(e) => setForm({ ...form, hoursBudget: e.target.value })}
              fullWidth
              size="small"
            />
            {isEditing && (
              <TextField
                select
                label="סטטוס"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                fullWidth
                size="small"
              >
                <MenuItem value="ACTIVE">פעיל</MenuItem>
                <MenuItem value="ON_HOLD">מושהה</MenuItem>
                <MenuItem value="COMPLETED">הושלם</MenuItem>
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', gap: 1 }}>
          <Button
            onClick={handleClose}
            sx={{ px: 3, py: 1, fontWeight: 700, borderRadius: '8px', color: '#64748b', '&:hover': { bgcolor: '#f8fafc' } }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving}
            sx={{
              px: 3, py: 1, bgcolor: '#2d7b95', fontWeight: 700, borderRadius: '8px',
              '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 6 }}>
              {saving ? 'hourglass_empty' : isEditing ? 'save' : 'add'}
            </span>
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
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        {detailProject && (
          <>
            {/* Detail Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '12px',
                    bgcolor: 'rgba(45,123,149,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#2d7b95' }}>web</span>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>
                      {detailProject.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {getClientNames(detailProject)}
                    </Typography>
                  </Box>
                </Box>
                <ProjectStatusChip status={detailProject.status} size="medium" />
              </Box>

              {/* Project Info */}
              {detailProject.description && (
                <Typography sx={{ fontSize: '0.875rem', color: '#475569', mt: 2 }}>
                  {detailProject.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
                  <Typography sx={{ fontSize: '0.8125rem' }}>התחלה: {formatDate(detailProject.startDate)}</Typography>
                </Box>
                {detailProject.targetDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event</span>
                    <Typography sx={{ fontSize: '0.8125rem' }}>יעד: {formatDate(detailProject.targetDate)}</Typography>
                  </Box>
                )}
                {detailProject.hoursBudget != null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                    <Typography sx={{ fontSize: '0.8125rem' }}>{detailProject.hoursBudget} שעות</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              sx={{
                px: 3,
                borderBottom: '1px solid #e2e8f0',
                '& .MuiTab-root': {
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  minHeight: 48,
                  color: '#64748b',
                  '&.Mui-selected': { color: '#2d7b95' },
                },
                '& .MuiTabs-indicator': { bgcolor: '#2d7b95' },
              }}
            >
              <Tab
                label={`משימות (${detailProject.tasks?.length || 0})`}
                icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>}
                iconPosition="start"
              />
              <Tab
                label={`תגובות (${detailProject.comments?.length || 0})`}
                icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>}
                iconPosition="start"
              />
              {!isClient && (
                <Tab
                  label={`לקוחות (${detailProject.clients?.length || 0})`}
                  icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>business</span>}
                  iconPosition="start"
                />
              )}
              {!isClient && (
                <Tab
                  label={`חברי צוות (${detailProject.assignedUsers?.length || 0})`}
                  icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>}
                  iconPosition="start"
                />
              )}
            </Tabs>

            <DialogContent sx={{ p: 3 }}>
              {/* Tasks Tab */}
              {detailTab === 0 && (
                <>
                  {detailProject.tasks && detailProject.tasks.length > 0 ? (
                    <Box sx={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                          <Box component="tr">
                            {['כותרת', 'סטטוס', 'עדיפות', 'דדליין'].map((h) => (
                              <Box component="th" key={h} sx={thStyle}>{h}</Box>
                            ))}
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {detailProject.tasks.map((task: Task) => (
                            <Box component="tr" key={task.id} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.03)' } }}>
                              <Box component="td" sx={{ ...tdStyle, fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>subject</span>
                                  {task.title}
                                </Box>
                              </Box>
                              <Box component="td" sx={tdStyle}><StatusChip status={task.status} /></Box>
                              <Box component="td" sx={tdStyle}><PriorityChip priority={task.priority} /></Box>
                              <Box component="td" sx={{ ...tdStyle, color: '#64748b', fontSize: '0.8125rem' }}>{formatDate(task.deadline)}</Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#e2e8f0' }}>task</span>
                      <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', mt: 1 }}>
                        אין משימות בפרויקט זה
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {/* Comments Tab */}
              {detailTab === 1 && (
                <Box>
                  {detailProject.comments && detailProject.comments.length > 0 ? (
                    <Box sx={{ mb: 3 }}>
                      {detailProject.comments.map((comment: Comment) => (
                        <Box
                          key={comment.id}
                          sx={{
                            display: 'flex', gap: 1.5, mb: 2, p: 2,
                            bgcolor: '#f8fafc', borderRadius: '10px',
                            border: '1px solid #f1f5f9',
                          }}
                        >
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2d7b95', fontSize: '0.85rem' }}>
                            {comment.author.firstName.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                                {comment.author.firstName} {comment.author.lastName}
                              </Typography>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                                {new Date(comment.createdAt).toLocaleString('he-IL')}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                              {comment.content}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, mb: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#e2e8f0' }}>chat_bubble</span>
                      <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', mt: 1 }}>
                        אין תגובות עדיין
                      </Typography>
                    </Box>
                  )}

                  {/* Add Comment */}
                  <Box sx={{
                    display: 'flex', gap: 1, alignItems: 'flex-end',
                    p: 2, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0',
                  }}>
                    <TextField
                      placeholder="כתוב תגובה..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      multiline
                      maxRows={4}
                      fullWidth
                      size="small"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendComment()
                        }
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
                    />
                    <Button
                      onClick={handleSendComment}
                      disabled={!newComment.trim() || sendingComment}
                      variant="contained"
                      sx={{
                        minWidth: 40, width: 40, height: 40, p: 0,
                        bgcolor: '#2d7b95', borderRadius: '8px',
                        '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Clients Tab */}
              {detailTab === 2 && !isClient && (
                <Box>
                  {/* Add Clients */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'flex-start' }}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={clients.filter(
                        (c) => !detailProject.clients?.some((pc) => pc.client.id === c.id)
                      )}
                      getOptionLabel={(c) => c.name}
                      value={selectedClientsToAdd}
                      onChange={(_, val) => setSelectedClientsToAdd(val)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="בחר לקוחות להוספה..." />
                      )}
                      sx={{ flex: 1 }}
                      noOptionsText="אין לקוחות זמינים"
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddClients}
                      disabled={selectedClientsToAdd.length === 0 || savingClients}
                      sx={{
                        minWidth: 100, mt: 0.25, bgcolor: '#2d7b95', fontWeight: 700,
                        borderRadius: '8px', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 6 }}>person_add</span>
                      הוסף
                    </Button>
                  </Box>

                  {/* Clients List */}
                  {detailProject.clients && detailProject.clients.length > 0 ? (
                    <Box sx={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                          <Box component="tr">
                            {['שם לקוח', 'איש קשר', 'תאריך שיוך', ''].map((h, i) => (
                              <Box component="th" key={i} sx={{ ...thStyle, ...(i === 3 ? { width: 48 } : {}) }}>{h}</Box>
                            ))}
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {detailProject.clients.map((pc: ProjectClientEntry) => (
                            <Box component="tr" key={pc.client.id} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.03)' } }}>
                              <Box component="td" sx={{ ...tdStyle, fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{
                                    width: 32, height: 32, borderRadius: '8px',
                                    bgcolor: 'rgba(45,123,149,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2d7b95' }}>business</span>
                                  </Box>
                                  {pc.client.name}
                                  {pc.isPrimary && (
                                    <Box sx={{
                                      px: 1, py: 0.25, borderRadius: '9999px',
                                      fontSize: '0.625rem', fontWeight: 700,
                                      bgcolor: 'rgba(45,123,149,0.1)', color: '#2d7b95',
                                    }}>
                                      ראשי
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                              <Box component="td" sx={{ ...tdStyle, color: '#64748b' }}>{pc.client.contactPerson}</Box>
                              <Box component="td" sx={{ ...tdStyle, color: '#94a3b8', fontSize: '0.8125rem' }}>
                                {new Date(pc.assignedAt).toLocaleDateString('he-IL')}
                              </Box>
                              <Box component="td" sx={{ ...tdStyle, textAlign: 'center' }}>
                                {detailProject.clients.length > 1 && (
                                  <Box
                                    component="button"
                                    onClick={() => handleRemoveClient(pc.client.id)}
                                    title="הסר לקוח מהפרויקט"
                                    sx={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: 28, height: 28, borderRadius: '6px', border: 'none',
                                      bgcolor: 'transparent', cursor: 'pointer', color: '#94a3b8',
                                      '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' },
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_remove</span>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#e2e8f0' }}>business</span>
                      <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', mt: 1 }}>
                        אין לקוחות משויכים לפרויקט
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Members Tab */}
              {detailTab === 3 && !isClient && (
                <Box>
                  {/* Add Members */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'flex-start' }}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={allUsers.filter(
                        (u) =>
                          u.isActive &&
                          u.role !== 'CLIENT' &&
                          !detailProject.assignedUsers?.some((a) => a.user.id === u.id)
                      )}
                      getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                      value={selectedUsersToAdd}
                      onChange={(_, val) => setSelectedUsersToAdd(val)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="בחר משתמשים להוספה..." />
                      )}
                      sx={{ flex: 1 }}
                      noOptionsText="אין משתמשים זמינים"
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddMembers}
                      disabled={selectedUsersToAdd.length === 0 || savingMembers}
                      sx={{
                        minWidth: 100, mt: 0.25, bgcolor: '#2d7b95', fontWeight: 700,
                        borderRadius: '8px', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 6 }}>person_add</span>
                      הוסף
                    </Button>
                  </Box>

                  {/* Members List */}
                  {detailProject.assignedUsers && detailProject.assignedUsers.length > 0 ? (
                    <Box sx={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                          <Box component="tr">
                            {['שם', 'תפקיד', 'תאריך שיוך', ''].map((h, i) => (
                              <Box component="th" key={i} sx={{ ...thStyle, ...(i === 3 ? { width: 48 } : {}) }}>{h}</Box>
                            ))}
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {detailProject.assignedUsers.map((assignment: ProjectAssignment) => {
                            const rc = roleColors[assignment.user.role] || roleColors.EMPLOYEE
                            return (
                              <Box component="tr" key={assignment.user.id} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.03)' } }}>
                                <Box component="td" sx={{ ...tdStyle, fontWeight: 600 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: '#2d7b95' }}>
                                      {assignment.user.firstName.charAt(0)}
                                    </Avatar>
                                    {assignment.user.firstName} {assignment.user.lastName}
                                  </Box>
                                </Box>
                                <Box component="td" sx={tdStyle}>
                                  <Box sx={{
                                    display: 'inline-flex', px: 1.5, py: 0.25, borderRadius: '9999px',
                                    fontSize: '0.6875rem', fontWeight: 700,
                                    bgcolor: rc.bg, color: rc.text,
                                  }}>
                                    {assignment.user.role === 'ADMIN' ? 'מנהל' : 'עובד'}
                                  </Box>
                                </Box>
                                <Box component="td" sx={{ ...tdStyle, color: '#94a3b8', fontSize: '0.8125rem' }}>
                                  {new Date(assignment.assignedAt).toLocaleDateString('he-IL')}
                                </Box>
                                <Box component="td" sx={{ ...tdStyle, textAlign: 'center' }}>
                                  <Box
                                    component="button"
                                    onClick={() => handleRemoveMember(assignment.user.id)}
                                    title="הסר מהפרויקט"
                                    sx={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: 28, height: 28, borderRadius: '6px', border: 'none',
                                      bgcolor: 'transparent', cursor: 'pointer', color: '#94a3b8',
                                      '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' },
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_remove</span>
                                  </Box>
                                </Box>
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#e2e8f0' }}>group</span>
                      <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', mt: 1 }}>
                        אין חברי צוות משויכים לפרויקט
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', gap: 1 }}>
              {!isClient && (
                <Button
                  onClick={() => {
                    setDetailDialogOpen(false)
                    handleEdit(detailProject)
                  }}
                  sx={{ px: 3, py: 1, fontWeight: 700, borderRadius: '8px', color: '#2d7b95', '&:hover': { bgcolor: 'rgba(45,123,149,0.05)' } }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 6 }}>edit</span>
                  עריכה
                </Button>
              )}
              <Button
                onClick={() => setDetailDialogOpen(false)}
                variant="contained"
                sx={{
                  px: 3, py: 1, bgcolor: '#2d7b95', fontWeight: 700, borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
                }}
              >
                סגור
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="מחיקת פרויקט"
        message={`האם למחוק את הפרויקט "${projectToDelete?.name}"? כל המשימות והנתונים הקשורים יימחקו לצמיתות.`}
        confirmText="מחק"
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setProjectToDelete(null) }}
      />
    </Box>
  )
}

export default ProjectsPage
