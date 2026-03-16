import React, { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
} from '@mui/material'
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
        bgcolor: '#f6f7f8',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Background gradient overlay */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0.3,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom right, rgba(45,123,149,0.2), transparent, rgba(45,123,149,0.1))',
        }}
      />

      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 4,
          py: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#2d7b95' }}>TimeTask</Typography>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: '#2d7b95',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>schedule</span>
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <Box
            sx={{
              background: 'linear-gradient(180deg, rgba(45,123,149,0.08) 0%, transparent 100%)',
              pt: 5,
              pb: 3,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                bgcolor: 'rgba(45,123,149,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#2d7b95' }}>lock_reset</span>
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              שחזור סיסמה
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 1, px: 3 }}>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </Typography>
          </Box>

          {/* Form */}
          <Box sx={{ px: 4, pb: 4 }}>
            {error && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  mb: 3,
                  bgcolor: '#fef2f2',
                  borderRight: '4px solid #ef4444',
                  borderRadius: '4px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ef4444' }}>error</span>
                <Typography sx={{ fontSize: '0.875rem', color: '#b91c1c', fontWeight: 500 }}>
                  {error}
                </Typography>
              </Box>
            )}

            {sent ? (
              <Box textAlign="center" sx={{ py: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>check_circle</span>
                </Box>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', mb: 1 }}>
                  הקישור נשלח!
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mb: 3 }}>
                  אם הכתובת קיימת במערכת, נשלח אליה מייל עם קישור לאיפוס סיסמה.
                </Typography>
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.875rem',
                    color: '#2d7b95',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  חזרה להתחברות
                </Link>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                    כתובת אימייל
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={loading}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>mail</span>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#f8fafc',
                        height: 44,
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    bgcolor: '#2d7b95',
                    boxShadow: '0 1px 2px 0 rgba(45,123,149,0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(45,123,149,0.9)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                      שלח קישור לשחזור
                    </Box>
                  )}
                </Button>

                {/* Footer */}
                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.875rem',
                      color: '#2d7b95',
                      fontWeight: 600,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                    חזרה להתחברות
                  </Link>
                </Box>
              </form>
            )}
          </Box>
        </Box>
      </Box>

      {/* Bottom links */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 3,
          pb: 3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Link sx={{ fontSize: '0.8125rem', color: '#94a3b8', textDecoration: 'none', cursor: 'pointer', '&:hover': { color: '#64748b' } }}>
          מרכז עזרה
        </Link>
        <Link sx={{ fontSize: '0.8125rem', color: '#94a3b8', textDecoration: 'none', cursor: 'pointer', '&:hover': { color: '#64748b' } }}>
          צור קשר
        </Link>
      </Box>
    </Box>
  )
}

export default ForgotPasswordPage
