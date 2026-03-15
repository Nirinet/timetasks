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
  Switch,
  FormControlLabel,
  LinearProgress,
  Tooltip,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { Client, Project } from '@/types'
import { formatDate } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ClientFormData {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  notes: string
  isActive: boolean
}

const emptyForm: ClientFormData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  isActive: true,
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await api.get('/clients')
      setClients(response.data.data?.clients || response.data.data || [])
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedClient(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleEdit = (client: Client) => {
    setIsEditing(true)
    setSelectedClient(client)
    setForm({
      name: client.name,
      contactPerson: client.contactPerson,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      isActive: client.isActive,
    })
    setDialogOpen(true)
  }

  const handleViewDetail = async (client: Client) => {
    try {
      const response = await api.get(`/clients/${client.id}`)
      setDetailClient(response.data.data?.client || response.data.data)
      setDetailDialogOpen(true)
    } catch {
      // error toast handled by api interceptor
    }
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!clientToDelete) return
    try {
      await api.delete(`/clients/${clientToDelete.id}`)
      toast.success('הלקוח נמחק בהצלחה')
      fetchClients()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedClient(null)
    setForm(emptyForm)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.contactPerson.trim()) {
      toast.error('שם לקוח ואיש קשר הם שדות חובה')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        contactPerson: form.contactPerson,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        ...(isEditing && { isActive: form.isActive }),
      }

      if (isEditing && selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, payload)
        toast.success('הלקוח עודכן בהצלחה')
      } else {
        await api.post('/clients', payload)
        toast.success('הלקוח נוצר בהצלחה')
      }
      handleClose()
      fetchClients()
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <PageHeader title="לקוחות" actionLabel="הוסף לקוח" onAction={handleCreate} />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {!loading && clients.length === 0 ? (
            <EmptyState title="אין לקוחות" subtitle="הוסף לקוח חדש כדי להתחיל" />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם לקוח</TableCell>
                    <TableCell>איש קשר</TableCell>
                    <TableCell>דוא"ל</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>פרויקטים</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell
                        sx={{ fontWeight: 500 }}
                        onClick={() => handleViewDetail(client)}
                      >
                        {client.name}
                      </TableCell>
                      <TableCell onClick={() => handleViewDetail(client)}>
                        {client.contactPerson}
                      </TableCell>
                      <TableCell onClick={() => handleViewDetail(client)}>
                        {client.email || '-'}
                      </TableCell>
                      <TableCell onClick={() => handleViewDetail(client)}>
                        {client.phone || '-'}
                      </TableCell>
                      <TableCell onClick={() => handleViewDetail(client)}>
                        <Chip label={client._count?.projects || 0} size="small" />
                      </TableCell>
                      <TableCell onClick={() => handleViewDetail(client)}>
                        <Chip
                          label={client.isActive ? 'פעיל' : 'לא פעיל'}
                          size="small"
                          color={client.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="צפייה">
                          <IconButton size="small" onClick={() => handleViewDetail(client)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="עריכה">
                          <IconButton size="small" onClick={() => handleEdit(client)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="מחיקה">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(client)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'עריכת לקוח' : 'הוספת לקוח חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="שם לקוח"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="איש קשר"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              required
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label='דוא"ל'
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="טלפון"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                fullWidth
              />
            </Box>
            <TextField
              label="כתובת"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              fullWidth
            />
            <TextField
              label="הערות"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            {isEditing && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                }
                label="לקוח פעיל"
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

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {detailClient?.name}
            <Chip
              label={detailClient?.isActive ? 'פעיל' : 'לא פעיל'}
              size="small"
              color={detailClient?.isActive ? 'success' : 'default'}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailClient && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">איש קשר</Typography>
                <Typography>{detailClient.contactPerson}</Typography>
              </Box>
              {detailClient.email && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">דוא"ל</Typography>
                  <Typography>{detailClient.email}</Typography>
                </Box>
              )}
              {detailClient.phone && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">טלפון</Typography>
                  <Typography>{detailClient.phone}</Typography>
                </Box>
              )}
              {detailClient.address && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">כתובת</Typography>
                  <Typography>{detailClient.address}</Typography>
                </Box>
              )}
              {detailClient.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">הערות</Typography>
                  <Typography>{detailClient.notes}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                פרויקטים ({detailClient.projects?.length || 0})
              </Typography>
              {detailClient.projects && detailClient.projects.length > 0 ? (
                <List dense>
                  {detailClient.projects.map((pc: any) => (
                    <ListItem key={pc.project?.id || pc.id}>
                      <ListItemText
                        primary={pc.project?.name || pc.name}
                        secondary={formatDate(pc.project?.startDate || pc.startDate)}
                      />
                      <ProjectStatusChip status={pc.project?.status || pc.status} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  אין פרויקטים ללקוח זה
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDetailDialogOpen(false)
              if (detailClient) handleEdit(detailClient)
            }}
          >
            עריכה
          </Button>
          <Button onClick={() => setDetailDialogOpen(false)} variant="contained">
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="מחיקת לקוח"
        message={`האם למחוק את הלקוח "${clientToDelete?.name}"? פעולה זו אינה ניתנת לביטול.`}
        confirmText="מחק"
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setClientToDelete(null) }}
      />
    </Box>
  )
}

export default ClientsPage
