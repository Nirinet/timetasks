import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  LinearProgress,
  Typography,
  Divider,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import toast from 'react-hot-toast'

import api from '@/services/api'
import PageHeader from '@/components/PageHeader'

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
      <PageHeader title="הגדרות מערכת" />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            הגדרות כלליות
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 500 }}>
            <TextField
              label="שם המערכת"
              value={settings.system_name}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
              fullWidth
              helperText="השם שיוצג בכותרת המערכת ובמיילים"
            />

            <TextField
              label="התראת טיימר שכוח (דקות)"
              type="number"
              value={settings.timer_alert_minutes}
              onChange={(e) => setSettings({ ...settings, timer_alert_minutes: e.target.value })}
              fullWidth
              helperText="לאחר כמה דקות ללא פעולה יישלח התראה על טיימר פעיל"
            />

            <TextField
              label="התראת דדליין מתקרב (שעות)"
              type="number"
              value={settings.deadline_alert_hours}
              onChange={(e) => setSettings({ ...settings, deadline_alert_hours: e.target.value })}
              fullWidth
              helperText="כמה שעות לפני הדדליין לשלוח התראה"
            />

            <Box>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'שומר...' : 'שמור הגדרות'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default SettingsPage
