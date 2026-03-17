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
  Switch,
  FormControlLabel,
  LinearProgress,
  Typography,
  Avatar,
} from '@mui/material'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { User, UserRole, Client } from '@/types'
import { getRoleLabel, formatDate } from '@/utils/formatters'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

const roleColorMap: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: '#fee2e2', text: '#dc2626' },
  EMPLOYEE: { bg: '#dbeafe', text: '#2563eb' },
  CLIENT: { bg: '#f3e8ff', text: '#7c3aed' },
}

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: UserRole
  isActive: boolean
  clientEntityId: string
}

const emptyForm: UserFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'EMPLOYEE',
  isActive: true,
  clientEntityId: '',
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [filterRole, setFilterRole] = useState<string>('')

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients')
      setClients(response.data.data?.clients || response.data.data || [])
    } catch {
      // ignore
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users')
      setUsers(response.data.data?.users || response.data.data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchClients()
  }, [])

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedUser(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setIsEditing(true)
    setSelectedUser(user)
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      clientEntityId: user.clientEntityId || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    try {
      await api.delete(`/users/${userToDelete.id}`)
      toast.success('המשתמש הושבת בהצלחה')
      fetchUsers()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedUser(null)
    setForm(emptyForm)
  }

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('שם פרטי ושם משפחה הם שדות חובה')
      return
    }
    if (!isEditing && (!form.email.trim() || !form.password.trim())) {
      toast.error('אימייל וסיסמה הם שדות חובה')
      return
    }

    setSaving(true)
    try {
      if (isEditing && selectedUser) {
        await api.put(`/users/${selectedUser.id}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          role: form.role,
          isActive: form.isActive,
          clientEntityId: form.role === 'CLIENT' && form.clientEntityId ? form.clientEntityId : null,
        })
        toast.success('המשתמש עודכן בהצלחה')
      } else {
        await api.post('/users', {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          role: form.role,
          clientEntityId: form.role === 'CLIENT' && form.clientEntityId ? form.clientEntityId : null,
        })
        toast.success('המשתמש נוצר בהצלחה')
      }
      handleClose()
      fetchUsers()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = filterRole ? users.filter(u => u.role === filterRole) : users

  // Stats
  const activeCount = users.filter(u => u.isActive).length
  const employeeCount = users.filter(u => u.role === 'EMPLOYEE').length
  const clientCount = users.filter(u => u.role === 'CLIENT').length

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#2d7b95', mb: 0.5 }}>ניהול משתמשים</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(45,123,149,0.6)' }}>נהל את צוות העובדים, הלקוחות וההרשאות במערכת.</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{
            bgcolor: '#2d7b95', fontWeight: 700, fontSize: '0.875rem', px: 3, py: 1.25,
            borderRadius: '12px', boxShadow: '0 4px 6px rgba(45,123,149,0.2)',
            '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>person_add</span>
          הוספת משתמש חדש
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ borderRadius: '16px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {[
            { value: '', label: 'הכל' },
            { value: 'ADMIN', label: 'מנהלים' },
            { value: 'EMPLOYEE', label: 'עובדים' },
            { value: 'CLIENT', label: 'לקוחות' },
          ].map((f) => (
            <Box
              key={f.value}
              onClick={() => setFilterRole(f.value)}
              sx={{
                px: 2, py: 1, borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: filterRole === f.value ? 700 : 500,
                bgcolor: filterRole === f.value ? 'rgba(45,123,149,0.1)' : 'white',
                color: filterRole === f.value ? '#2d7b95' : 'rgba(45,123,149,0.6)',
                border: `1px solid ${filterRole === f.value ? 'rgba(45,123,149,0.2)' : 'rgba(45,123,149,0.1)'}`,
                transition: 'all 0.15s',
                '&:hover': { borderColor: 'rgba(45,123,149,0.3)' },
              }}
            >
              {f.label}
            </Box>
          ))}
        </Box>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

      {/* Users Table */}
      <Card sx={{ borderRadius: '16px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {!loading && filteredUsers.length === 0 ? (
          <EmptyState title="אין משתמשים" subtitle="הוסף משתמש חדש כדי להתחיל" />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>שם משתמש</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>אימייל</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>תפקיד</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>סטטוס</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>טלפון</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>תאריך הצטרפות</TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(45,123,149,0.05)', color: 'rgba(45,123,149,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => {
                  const roleColors = roleColorMap[u.role] || roleColorMap.EMPLOYEE
                  return (
                    <TableRow key={u.id} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.05)' }, transition: 'background 0.15s', cursor: 'pointer' }} onClick={() => handleEdit(u)}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={u.avatar} sx={{ width: 40, height: 40, bgcolor: 'rgba(45,123,149,0.2)', border: '1px solid rgba(45,123,149,0.1)', fontSize: '0.875rem', fontWeight: 700, color: '#2d7b95' }}>
                            {u.firstName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#2d7b95' }}>{u.firstName} {u.lastName}</Typography>
                            <Typography sx={{ fontSize: '0.625rem', color: 'rgba(45,123,149,0.5)' }}>
                              {u.lastLogin ? `מחובר לאחרונה: ${formatDate(u.lastLogin)}` : 'טרם התחבר'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: 'rgba(45,123,149,0.8)' }}>{u.email}</TableCell>
                      <TableCell>
                        <Box sx={{
                          display: 'inline-flex', px: 1.25, py: 0.5, borderRadius: '9999px',
                          bgcolor: roleColors.bg, color: roleColors.text,
                          fontSize: '0.6875rem', fontWeight: 700,
                        }}>
                          {getRoleLabel(u.role)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: u.isActive ? '#22c55e' : '#cbd5e1',
                            animation: u.isActive ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                          }} />
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: u.isActive ? '#16a34a' : '#94a3b8' }}>
                            {u.isActive ? 'פעיל' : 'לא פעיל'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: 'rgba(45,123,149,0.8)' }} dir="ltr">{u.phone || '-'}</TableCell>
                      <TableCell>
                        {u.googleId ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: '9999px', bgcolor: '#d1fae5', color: '#047857', fontSize: '0.6875rem', fontWeight: 600 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                            מקושר
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: 'rgba(45,123,149,0.8)' }}>{formatDate(u.joinDate)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(u) }} sx={{ color: 'rgba(45,123,149,0.6)', '&:hover': { bgcolor: 'rgba(45,123,149,0.1)' } }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleDelete(u) }}
                            sx={{
                              color: u.isActive ? '#f87171' : '#22c55e',
                              '&:hover': { bgcolor: u.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' },
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{u.isActive ? 'person_off' : 'person_check'}</span>
                          </IconButton>
                          {u.googleId && (
                            <IconButton
                              size="small"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await api.post('/auth/unlink-google', { userId: u.id })
                                  toast.success('קישור Google בוטל בהצלחה')
                                  fetchUsers()
                                } catch {}
                              }}
                              sx={{ color: 'rgba(45,123,149,0.6)', '&:hover': { bgcolor: 'rgba(45,123,149,0.1)' } }}
                              title="בטל קישור Google"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link_off</span>
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
        <Card sx={{ p: 2, borderRadius: '16px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>person</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#2d7b95' }}>{activeCount}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(45,123,149,0.6)' }}>משתמשים פעילים</Typography>
          </Box>
        </Card>
        <Card sx={{ p: 2, borderRadius: '16px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>badge</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#2d7b95' }}>{employeeCount}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(45,123,149,0.6)' }}>עובדים בצוות</Typography>
          </Box>
        </Card>
        <Card sx={{ p: 2, borderRadius: '16px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>handshake</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#2d7b95' }}>{clientCount}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(45,123,149,0.6)' }}>לקוחות רשומים</Typography>
          </Box>
        </Card>
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
          {isEditing ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {!isEditing && (
              <>
                <TextField label="דוא״ל" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth size="small" />
                <TextField label="סיסמה" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required fullWidth size="small" helperText="לפחות 8 תווים, אות גדולה, אות קטנה ומספר" />
              </>
            )}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField label="שם פרטי" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required fullWidth size="small" />
              <TextField label="שם משפחה" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required fullWidth size="small" />
            </Box>
            <TextField label="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth size="small" />
            <TextField select label="תפקיד" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, clientEntityId: e.target.value !== 'CLIENT' ? '' : form.clientEntityId })} fullWidth size="small">
              <MenuItem value="ADMIN">מנהל</MenuItem>
              <MenuItem value="EMPLOYEE">עובד</MenuItem>
              <MenuItem value="CLIENT">לקוח</MenuItem>
            </TextField>
            {form.role === 'CLIENT' && (
              <TextField select label="שיוך לישות לקוח" value={form.clientEntityId} onChange={(e) => setForm({ ...form, clientEntityId: e.target.value })} fullWidth size="small" helperText="בחר את הלקוח העסקי שהמשתמש משויך אליו">
                <MenuItem value="">ללא שיוך</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            )}
            {isEditing && (
              <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="משתמש פעיל" />
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="השבתת משתמש"
        message={`האם להשבית את המשתמש ${userToDelete?.firstName} ${userToDelete?.lastName}? המשתמש לא יוכל להתחבר למערכת.`}
        confirmText="השבת"
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setUserToDelete(null) }}
      />
    </Box>
  )
}

export default UsersPage
