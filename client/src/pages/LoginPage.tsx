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
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import logoSrc from '@/assets/logo.svg'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, loginWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, password)
      if (!success) {
        setError('פרטי ההתחברות שגויים')
      }
    } catch (err) {
      setError('אירעה שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('לא התקבל אסימון מ-Google')
      return
    }
    setError('')
    setGoogleLoading(true)
    try {
      const success = await loginWithGoogle(credentialResponse.credential)
      if (!success) {
        setError('אינך רשום למערכת')
      }
    } catch {
      setError('אירעה שגיאה בהתחברות עם Google')
    } finally {
      setGoogleLoading(false)
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
          px: { xs: 2, sm: 4 },
          py: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box />
        <Box component="img" src={logoSrc} alt="TimeTask" sx={{ height: 36, width: 'auto' }} />
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
          {/* Card header with gradient */}
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
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#2d7b95' }}>lock</span>
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              התחברות למערכת
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 1 }}>
              ברוכים הקבאים ל-TimeTask. נא להזין את פרטיך
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

            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  אימייל
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

              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  סיסמה
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="הזן סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>lock</span>
                      </InputAdornment>
                    ),
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="start">
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </IconButton>
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

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                      sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#2d7b95' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>זכור אותי</Typography>}
                />
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  sx={{ fontSize: '0.8125rem', color: '#2d7b95', fontWeight: 500, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  שכחת סיסמה?
                </Link>
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
                    boxShadow: '0 4px 6px -1px rgba(45,123,149,0.3)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'התחבר'}
              </Button>
            </form>

            {/* Google Sign-In Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                או
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e2e8f0' }} />
            </Box>

            {/* Google Sign-In Button */}
            {googleLoading ? (
              <Button
                fullWidth
                variant="outlined"
                disabled
                sx={{
                  py: 1.25,
                  borderRadius: '8px',
                  borderColor: '#e2e8f0',
                  color: '#94a3b8',
                }}
              >
                <CircularProgress size={20} sx={{ ml: 1 }} />
                מתחבר עם Google...
              </Button>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('ההתחברות עם Google נכשלה')}
                  theme="outline"
                  size="large"
                  width="300"
                  text="signin_with"
                />
              </Box>
            )}

            {/* Footer */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                עדיין אין לך חשבון?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ color: '#2d7b95', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  צור חשבון חדש
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default LoginPage
