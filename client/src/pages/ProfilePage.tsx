import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import LockIcon from '@mui/icons-material/Lock'
import toast from 'react-hot-toast'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleLabel, formatDate } from '@/utils/formatters'
import PageHeader from '@/components/PageHeader'

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth()

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferences
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    timerAlerts: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      })
      setPrefs({
        emailNotifications: user.emailNotifications ?? true,
        timerAlerts: user.timerAlerts ?? true,
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      toast.error('שם פרטי ושם משפחה הם שדות חובה')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
      })
      toast.success('הפרופיל עודכן בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePrefs = async () => {
    setSavingPrefs(true)
    try {
      await updateProfile({
        emailNotifications: prefs.emailNotifications,
        timerAlerts: prefs.timerAlerts,
      })
      toast.success('ההעדפות עודכנו בהצלחה')
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('יש למלא את כל שדות הסיסמה')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('הסיסמאות אינן תואמות')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('הסיסמה החדשה חייבת להכיל לפחות 8 תווים')
      return
    }

    setSavingPassword(true)
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      toast.success('הסיסמה שונתה בהצלחה')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Box>
      <PageHeader title="פרופיל" />

      <Grid container spacing={3}>
        {/* Personal Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="פרטים אישיים" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="שם פרטי"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    required
                    fullWidth
                  />
                  <TextField
                    label="שם משפחה"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    required
                    fullWidth
                  />
                </Box>
                <TextField
                  label="טלפון"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='דוא"ל'
                  value={user?.email || ''}
                  disabled
                  fullWidth
                  helperText="לא ניתן לשנות את כתובת הדוא״ל"
                />
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">תפקיד</Typography>
                    <Typography>{user ? getRoleLabel(user.role) : ''}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">תאריך הצטרפות</Typography>
                    <Typography>{formatDate(user?.joinDate)}</Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {savingProfile ? 'שומר...' : 'שמור שינויים'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences & Password */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="העדפות" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.emailNotifications}
                      onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
                    />
                  }
                  label='התראות דוא"ל'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.timerAlerts}
                      onChange={(e) => setPrefs({ ...prefs, timerAlerts: e.target.checked })}
                    />
                  }
                  label="התראות טיימר"
                />
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePrefs}
                  disabled={savingPrefs}
                  sx={{ alignSelf: 'flex-start', mt: 1 }}
                >
                  {savingPrefs ? 'שומר...' : 'שמור העדפות'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="שינוי סיסמה" avatar={<LockIcon />} />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="סיסמה נוכחית"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="סיסמה חדשה"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  fullWidth
                  helperText="לפחות 8 תווים"
                />
                <TextField
                  label="אישור סיסמה חדשה"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  fullWidth
                  error={passwordForm.confirmPassword !== '' && passwordForm.confirmPassword !== passwordForm.newPassword}
                  helperText={
                    passwordForm.confirmPassword !== '' && passwordForm.confirmPassword !== passwordForm.newPassword
                      ? 'הסיסמאות אינן תואמות'
                      : ''
                  }
                />
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<LockIcon />}
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {savingPassword ? 'משנה...' : 'שנה סיסמה'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProfilePage
