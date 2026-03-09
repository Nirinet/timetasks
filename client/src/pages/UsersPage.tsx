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
  Chip,
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
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { User, UserRole } from '@/types'
import { getRoleLabel, formatDate } from '@/utils/formatters'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: UserRole
  isActive: boolean
}

const emptyForm: UserFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'EMPLOYEE',
  isActive: true,
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

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
    })
    setDialogOpen(true)
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

  return (
    <Box>
      <PageHeader title="משתמשים" actionLabel="הוסף משתמש" onAction={handleCreate} />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {!loading && users.length === 0 ? (
            <EmptyState title="אין משתמשים" subtitle="הוסף משתמש חדש כדי להתחיל" />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם מלא</TableCell>
                    <TableCell>דוא"ל</TableCell>
                    <TableCell>תפקיד</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>תאריך הצטרפות</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleEdit(user)}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          size="small"
                          color={user.role === 'ADMIN' ? 'primary' : user.role === 'EMPLOYEE' ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'פעיל' : 'לא פעיל'}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>{formatDate(user.joinDate)}</TableCell>
                      <TableCell>
                        <Tooltip title="עריכה">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(user)
                            }}
                          >
                            <EditIcon fontSize="small" />
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!isEditing && (
              <>
                <TextField
                  label="דוא״ל"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="סיסמה"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  fullWidth
                  helperText="לפחות 8 תווים, אות גדולה, אות קטנה ומספר"
                />
              </>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="שם פרטי"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="שם משפחה"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                fullWidth
              />
            </Box>
            <TextField
              label="טלפון"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="תפקיד"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              fullWidth
            >
              <MenuItem value="ADMIN">מנהל</MenuItem>
              <MenuItem value="EMPLOYEE">עובד</MenuItem>
              <MenuItem value="CLIENT">לקוח</MenuItem>
            </TextField>
            {isEditing && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                }
                label="משתמש פעיל"
              />
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
    </Box>
  )
}

export default UsersPage
