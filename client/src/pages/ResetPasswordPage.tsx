import React, { useState } from 'react'
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import api from '@/services/api'
import toast from 'react-hot-toast'

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (newPassword.length < 8) {
      setError('סיסמה חייבת להכיל לפחות 8 תווים')
      return
    }

    setLoading(true)

    try {
      const res = await api.post('/auth/reset-password', { token, newPassword })
      toast.success(res.data.message || 'הסיסמה שונתה בהצלחה')
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.message || 'אירעה שגיאה. ייתכן שהקישור פג תוקף')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                קישור לא תקין. נסה לבקש איפוס סיסמה מחדש.
              </Alert>
              <Link component={RouterLink} to="/forgot-password" variant="body1">
                בקש איפוס סיסמה
              </Link>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 600, color: 'primary.main' }}
              >
                איפוס סיסמה
              </Typography>
              <Typography variant="body1" color="text.secondary">
                הזן את הסיסמה החדשה שלך
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="סיסמה חדשה"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={loading}
                helperText="לפחות 8 תווים, אות קטנה, אות גדולה ומספר"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="אישור סיסמה"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={confirmPassword !== '' && newPassword !== confirmPassword ? 'הסיסמאות אינן תואמות' : ''}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5, fontSize: '16px', fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'שנה סיסמה'}
              </Button>

              <Box mt={2} textAlign="center">
                <Link component={RouterLink} to="/login" variant="body2">
                  <ArrowForwardIcon sx={{ ml: 0.5, fontSize: 16, verticalAlign: 'middle' }} />
                  חזרה להתחברות
                </Link>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default ResetPasswordPage
