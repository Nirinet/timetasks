import React, { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'אירעה שגיאה. נסה שוב מאוחר יותר')
    } finally {
      setLoading(false)
    }
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
                שכחת סיסמה?
              </Typography>
              <Typography variant="body1" color="text.secondary">
                הזן את כתובת הדוא״ל שלך ונשלח לך קישור לאיפוס הסיסמה
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            {sent ? (
              <Box textAlign="center">
                <Alert severity="success" sx={{ mb: 3 }}>
                  אם הכתובת קיימת במערכת, נשלח אליה מייל עם קישור לאיפוס סיסמה.
                  בדוק את תיבת הדואר שלך.
                </Alert>
                <Link component={RouterLink} to="/login" variant="body1">
                  <ArrowForwardIcon sx={{ ml: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                  חזרה להתחברות
                </Link>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="כתובת דוא״ל"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoFocus
                  disabled={loading}
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
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'שלח קישור איפוס'}
                </Button>

                <Box mt={2} textAlign="center">
                  <Link component={RouterLink} to="/login" variant="body2">
                    <ArrowForwardIcon sx={{ ml: 0.5, fontSize: 16, verticalAlign: 'middle' }} />
                    חזרה להתחברות
                  </Link>
                </Box>
              </form>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default ForgotPasswordPage
