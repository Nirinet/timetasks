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
  Switch,
  FormControlLabel,
  LinearProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { Client } from '@/types'
import { formatDate } from '@/utils/formatters'
import ProjectStatusChip from '@/components/ProjectStatusChip'
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
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.875rem' }, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>ניהול לקוחות</Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, color: '#64748b', mt: 0.5 }}>מרכז שליטה ובקרה על כלל לקוחות המערכת והפרויקטים המשויכים.</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{
            bgcolor: '#2d7b95', fontWeight: 700, fontSize: '0.875rem', px: 2.5, py: 1.25,
            borderRadius: '8px', boxShadow: '0 4px 6px rgba(45,123,149,0.2)',
            '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>person_add</span>
          הוספת לקוח חדש
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

      {/* Clients Table */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {!loading && clients.length === 0 ? (
          <EmptyState title="אין לקוחות" subtitle="הוסף לקוח חדש כדי להתחיל" />
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {['שם העסק', 'איש קשר', 'פרטי התקשרות', 'פרויקטים', 'סטטוס', 'פעולות'].map((h) => (
                      <TableCell key={h} sx={{
                        bgcolor: 'rgba(248,250,252,0.5)', color: '#64748b', fontWeight: 700,
                        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid #e2e8f0',
                        ...(h === 'פרויקטים' ? { textAlign: 'center' } : {}),
                      }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map((client) => {
                    const projectCount = (client as any)._count?.projects ?? (client as any).projects?.length ?? 0
                    return (
                      <TableRow key={client.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer', transition: 'background 0.15s' }}>
                        <TableCell onClick={() => handleViewDetail(client)}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                              width: 32, height: 32, borderRadius: '4px', bgcolor: 'rgba(45,123,149,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#2d7b95', fontWeight: 700, fontSize: '0.875rem',
                            }}>
                              {client.name?.[0]}
                            </Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{client.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(client)} sx={{ fontSize: '0.875rem' }}>{client.contactPerson}</TableCell>
                        <TableCell onClick={() => handleViewDetail(client)}>
                          <Typography sx={{ fontSize: '0.875rem' }}>{client.phone || '-'}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{client.email || ''}</Typography>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(client)} sx={{ textAlign: 'center' }}>
                          <Box sx={{
                            display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: '9999px',
                            bgcolor: projectCount > 0 ? 'rgba(45,123,149,0.1)' : '#f1f5f9',
                            color: projectCount > 0 ? '#2d7b95' : '#94a3b8',
                            fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            {projectCount} {projectCount === 1 ? 'פרויקט' : 'פרויקטים'}
                          </Box>
                        </TableCell>
                        <TableCell onClick={() => handleViewDetail(client)}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, py: 0.5, px: 1.25, borderRadius: '9999px', bgcolor: client.isActive ? '#d1fae5' : '#f1f5f9', fontSize: '0.75rem', fontWeight: 500 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: client.isActive ? '#059669' : '#94a3b8' }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: client.isActive ? '#047857' : '#64748b' }}>
                              {client.isActive ? 'פעיל' : 'לא פעיל'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleEdit(client)} sx={{ color: '#94a3b8', '&:hover': { color: '#2d7b95' } }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(client)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination footer */}
            <Box sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: 'rgba(248,250,252,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>מציג {clients.length} לקוחות</Typography>
            </Box>
          </>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
          {isEditing ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="שם לקוח" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth size="small" />
            <TextField label="איש קשר" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} required fullWidth size="small" />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField label='דוא"ל' type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth size="small" />
              <TextField label="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth size="small" />
            </Box>
            <TextField label="כתובת" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth size="small" />
            <TextField label="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={3} fullWidth size="small" />
            {isEditing && (
              <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="לקוח פעיל" />
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{detailClient?.name}</Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75, py: 0.5, px: 1.25, borderRadius: '9999px',
              bgcolor: detailClient?.isActive ? '#d1fae5' : '#f1f5f9',
              fontSize: '0.75rem', fontWeight: 500,
              color: detailClient?.isActive ? '#047857' : '#64748b',
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: detailClient?.isActive ? '#059669' : '#94a3b8' }} />
              {detailClient?.isActive ? 'פעיל' : 'לא פעיל'}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailClient && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>איש קשר</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{detailClient.contactPerson}</Typography>
                </Box>
                {detailClient.email && (
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>דוא"ל</Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>{detailClient.email}</Typography>
                  </Box>
                )}
                {detailClient.phone && (
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>טלפון</Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>{detailClient.phone}</Typography>
                  </Box>
                )}
                {detailClient.address && (
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>כתובת</Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>{detailClient.address}</Typography>
                  </Box>
                )}
              </Box>
              {detailClient.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>הערות</Typography>
                  <Typography sx={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{detailClient.notes}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>
                פרויקטים ({detailClient.projects?.length || 0})
              </Typography>
              {detailClient.projects && detailClient.projects.length > 0 ? (
                <List dense>
                  {detailClient.projects.map((pc: any) => (
                    <ListItem key={pc.project?.id || pc.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={pc.project?.name || pc.name}
                        secondary={formatDate(pc.project?.startDate || pc.startDate)}
                        primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      <ProjectStatusChip status={pc.project?.status || pc.status} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>אין פרויקטים ללקוח זה</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => { setDetailDialogOpen(false); if (detailClient) handleEdit(detailClient) }} sx={{ color: '#64748b' }}>עריכה</Button>
          <Button onClick={() => setDetailDialogOpen(false)} variant="contained" sx={{ bgcolor: '#2d7b95', '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' } }}>סגור</Button>
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
