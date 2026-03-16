import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  TextField,
  Button,
  LinearProgress,
  Typography,
} from '@mui/material'
import toast from 'react-hot-toast'

import api from '@/services/api'

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    timer_alert_minutes: '120',
    deadline_alert_hours: '24',
    system_name: 'TimeTask',
  })

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      const data = response.data.data?.settings || {}
      setSettings({
        timer_alert_minutes: data.timer_alert_minutes || '120',
        deadline_alert_hours: data.deadline_alert_hours || '24',
        system_name: data.system_name || 'TimeTask',
      })
    } catch {
      // error toast handled by api interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      toast.success('ההגדרות נשמרו בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.875rem' }, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>הגדרות מערכת</Typography>
        <Typography sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, color: '#64748b', mt: 1 }}>ניהול תצורת המערכת, עדיפויות, סטטוסים והתראות גלובליות</Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, bgcolor: 'rgba(45,123,149,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2d7b95' } }} />}

      {/* Main Configuration Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 6 }}>
        {/* System Name */}
        <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#2d7b95' }}>
            <span className="material-symbols-outlined">label</span>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>שם המערכת</Typography>
          </Box>
          <TextField
            value={settings.system_name}
            onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
            fullWidth
            size="small"
          />
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>השם המופיע בכותרות ובמיילים</Typography>
        </Card>

        {/* Timer Alert */}
        <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#2d7b95' }}>
            <span className="material-symbols-outlined">timer</span>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>סף התראת טיימר</Typography>
          </Box>
          <Box sx={{ position: 'relative' }}>
            <TextField
              type="number"
              value={settings.timer_alert_minutes}
              onChange={(e) => setSettings({ ...settings, timer_alert_minutes: e.target.value })}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', ml: 1 }}>דקות</Typography>,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>התראה על טיימר פעיל מדי</Typography>
        </Card>

        {/* Deadline Alert */}
        <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#2d7b95' }}>
            <span className="material-symbols-outlined">notification_important</span>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>חלון התראת Deadline</Typography>
          </Box>
          <Box sx={{ position: 'relative' }}>
            <TextField
              type="number"
              value={settings.deadline_alert_hours}
              onChange={(e) => setSettings({ ...settings, deadline_alert_hours: e.target.value })}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', ml: 1 }}>שעות</Typography>,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>התראה לפני מועד סיום משימה</Typography>
        </Card>
      </Box>

      {/* Priority Management */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 4, mb: 6 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <span className="material-symbols-outlined" style={{ color: '#2d7b95' }}>priority_high</span>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>ניהול עדיפויות</Typography>
          </Box>
          <Card sx={{ borderRadius: '12px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 400, borderCollapse: 'collapse', textAlign: 'right' }}>
              <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                <Box component="tr">
                  {['רמה', 'שם', 'צבע', 'אייקון'].map((h) => (
                    <Box component="th" key={h} sx={{ px: 3, py: 2, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(45,123,149,0.1)' }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {[
                  { level: 1, name: 'דחוף וחשוב', color: '#ef4444', ringColor: '#fee2e2', icon: 'error' },
                  { level: 2, name: 'חשוב', color: '#f97316', ringColor: '#ffedd5', icon: 'warning' },
                  { level: 3, name: 'רגיל', color: '#eab308', ringColor: '#fef9c3', icon: 'info' },
                  { level: 4, name: 'נמוך', color: '#22c55e', ringColor: '#d1fae5', icon: 'arrow_downward' },
                ].map((p) => (
                  <Box component="tr" key={p.level} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.05)' }, borderBottom: '1px solid rgba(45,123,149,0.1)' }}>
                    <Box component="td" sx={{ px: 3, py: 2, fontSize: '0.875rem', fontWeight: 500 }}>{p.level}</Box>
                    <Box component="td" sx={{ px: 3, py: 2, fontSize: '0.875rem' }}>{p.name}</Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: p.color, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', outline: `3px solid ${p.ringColor}` }} />
                    </Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <span className="material-symbols-outlined" style={{ color: p.color, fontSize: 20 }}>{p.icon}</span>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            </Box>
          </Card>
        </Box>

        {/* Status Management */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <span className="material-symbols-outlined" style={{ color: '#2d7b95' }}>fluorescent</span>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>ניהול סטטוסים</Typography>
          </Box>
          <Card sx={{ borderRadius: '12px', border: '1px solid rgba(45,123,149,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 400, borderCollapse: 'collapse', textAlign: 'right' }}>
              <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                <Box component="tr">
                  {['קוד', 'שם תצוגה', 'צבע'].map((h) => (
                    <Box component="th" key={h} sx={{ px: 3, py: 2, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(45,123,149,0.1)' }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {[
                  { code: 'NEW', name: 'חדש', bg: '#f1f5f9', text: '#64748b', borderColor: '#e2e8f0', label: 'אפור בהיר' },
                  { code: 'IN_PROGRESS', name: 'בביצוע', bg: '#eff6ff', text: '#2563eb', borderColor: '#bfdbfe', label: 'כחול' },
                  { code: 'WAITING_CLIENT', name: 'ממתין ללקוח', bg: '#faf5ff', text: '#7c3aed', borderColor: '#e9d5ff', label: 'סגול' },
                  { code: 'COMPLETED', name: 'הושלם', bg: '#f0fdf4', text: '#16a34a', borderColor: '#bbf7d0', label: 'ירוק' },
                ].map((s) => (
                  <Box component="tr" key={s.code} sx={{ '&:hover': { bgcolor: 'rgba(45,123,149,0.05)' }, borderBottom: '1px solid rgba(45,123,149,0.1)' }}>
                    <Box component="td" sx={{ px: 3, py: 2, fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{s.code}</Box>
                    <Box component="td" sx={{ px: 3, py: 2, fontSize: '0.875rem' }}>{s.name}</Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, bgcolor: s.bg, color: s.text, border: `1px solid ${s.borderColor}` }}>
                        {s.label}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, py: 4, borderTop: '1px solid rgba(45,123,149,0.1)' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            px: 4, py: 1.5, bgcolor: '#2d7b95', fontWeight: 700, borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(45,123,149,0.3)',
            '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>save</span>
          {saving ? 'שומר...' : 'שמירת שינויים'}
        </Button>
        <Button
          variant="outlined"
          onClick={fetchSettings}
          sx={{ px: 4, py: 1.5, fontWeight: 700, borderRadius: '8px', borderColor: '#e2e8f0', color: '#64748b', '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' } }}
        >
          ביטול
        </Button>
      </Box>
    </Box>
  )
}

export default SettingsPage
