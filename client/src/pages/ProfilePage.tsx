import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Grid,
  TextField,
  Button,
  Switch,
  Typography,
  Avatar,
  Divider,
} from '@mui/material'
import toast from 'react-hot-toast'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'

import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleLabel, formatDate } from '@/utils/formatters'

const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout, linkGoogle, unlinkGoogle } = useAuth()
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false)

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    timerAlerts: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

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
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Profile Header Card */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          mb: 3,
          textAlign: 'center',
          pt: 5,
          pb: 4,
          px: 3,
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{
              width: 100,
              height: 100,
              mx: 'auto',
              bgcolor: '#2d7b95',
              fontSize: '2.5rem',
              fontWeight: 600,
            }}
          >
            {user?.firstName?.charAt(0)}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: '#2d7b95',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid white',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>photo_camera</span>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
          {user ? getRoleLabel(user.role) : ''}
        </Typography>
      </Card>

      {/* Personal Info */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#2d7b95' }}>badge</span>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            מידע אישי
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 0.5 }}>שם מלא</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 0.5 }}>כתובת אימייל</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                {user?.email}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 0.5 }}>תפקיד במערכת</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                {user ? getRoleLabel(user.role) : ''}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 0.5 }}>מספר טלפון</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', direction: 'ltr', textAlign: 'right' }}>
                {user?.phone || '-'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* Notification Preferences */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#2d7b95' }}>notifications</span>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            העדפות התראות
          </Typography>
        </Box>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              py: 2,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                התראות אימייל
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                קבל עדכונים שבועיים וסיכומי פרויקטים ישירות למייל
              </Typography>
            </Box>
            <Switch
              checked={prefs.emailNotifications}
              onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#2d7b95' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#2d7b95' },
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              py: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                התראות טיימר
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                התראות קופצות כאשר הטיימר פעיל מעל שעתיים ברצף
              </Typography>
            </Box>
            <Switch
              checked={prefs.timerAlerts}
              onChange={(e) => setPrefs({ ...prefs, timerAlerts: e.target.checked })}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#2d7b95' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#2d7b95' },
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Google Account Linking */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#2d7b95' }}>account_circle</span>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            חשבון Google
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          {user?.googleId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%',
                  bgcolor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#16a34a' }}>check_circle</span>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                    חשבון Google מקושר
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    ניתן להתחבר למערכת באמצעות Google
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={async () => {
                  setUnlinkingGoogle(true)
                  try { await unlinkGoogle() } catch {} finally { setUnlinkingGoogle(false) }
                }}
                disabled={unlinkingGoogle}
                sx={{ borderRadius: '8px', fontWeight: 600 }}
              >
                {unlinkingGoogle ? 'מבטל...' : 'בטל קישור'}
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography sx={{ fontSize: '0.9375rem', color: '#64748b', mb: 2 }}>
                קשר את חשבון Google שלך כדי להתחבר למערכת בקלות
              </Typography>
              {linkingGoogle ? (
                <Button variant="outlined" disabled sx={{ borderRadius: '8px' }}>
                  מקשר...
                </Button>
              ) : (
                <GoogleLogin
                  onSuccess={async (credentialResponse: CredentialResponse) => {
                    if (!credentialResponse.credential) return
                    setLinkingGoogle(true)
                    try { await linkGoogle(credentialResponse.credential) } catch {} finally { setLinkingGoogle(false) }
                  }}
                  onError={() => toast.error('קישור חשבון Google נכשל')}
                  theme="outline"
                  size="large"
                  text="signin_with"
                />
              )}
            </Box>
          )}
        </Box>
      </Card>

      {/* Password Change */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#2d7b95' }}>lock</span>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            שינוי סיסמה
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                סיסמה נוכחית
              </Typography>
              <TextField
                fullWidth
                type="password"
                size="small"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                סיסמה חדשה
              </Typography>
              <TextField
                fullWidth
                type="password"
                size="small"
                placeholder="••••••••"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                אימות סיסמה
              </Typography>
              <TextField
                fullWidth
                type="password"
                size="small"
                placeholder="••••••••"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                error={passwordForm.confirmPassword !== '' && passwordForm.confirmPassword !== passwordForm.newPassword}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={savingPassword}
            sx={{
              mt: 3,
              bgcolor: '#2d7b95',
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 8 }}>lock</span>
            {savingPassword ? 'משנה...' : 'עדכן סיסמה'}
          </Button>
        </Box>
      </Card>

      {/* Logout */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          py: 2,
          cursor: 'pointer',
          color: '#64748b',
          '&:hover': { color: '#ef4444' },
        }}
        onClick={logout}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>התנתקות</Typography>
      </Box>
    </Box>
  )
}

export default ProfilePage
