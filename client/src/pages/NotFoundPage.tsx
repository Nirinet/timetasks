import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f7f8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 4,
          py: 2,
          bgcolor: 'white',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
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

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 10,
        }}
      >
        {/* Big 404 */}
        <Box sx={{ position: 'relative', mb: 4 }}>
          <Typography
            sx={{
              fontSize: '10rem',
              fontWeight: 800,
              color: '#e2e8f0',
              lineHeight: 1,
              letterSpacing: '-0.05em',
            }}
          >
            4
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '0.75em',
                position: 'relative',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '5rem',
                  color: '#2d7b95',
                  position: 'absolute',
                }}
              >
                schedule
              </span>
              <Box component="span" sx={{ opacity: 0 }}>0</Box>
            </Box>
            4
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', mb: 1.5, textAlign: 'center' }}>
          אופס! הדף שחיפשת לא נמצא
        </Typography>
        <Typography sx={{ fontSize: '0.9375rem', color: '#64748b', mb: 5, textAlign: 'center' }}>
          ייתכן שהכתובת שגויה או שהדף הוסר.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 8 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>home</span>}
            sx={{
              bgcolor: '#2d7b95',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              borderRadius: '8px',
              boxShadow: '0 1px 2px 0 rgba(45,123,149,0.2)',
              '&:hover': { bgcolor: 'rgba(45,123,149,0.9)' },
            }}
          >
            חזרה לדף הבית
          </Button>
          <Button
            variant="outlined"
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>support_agent</span>}
            sx={{
              borderColor: '#e2e8f0',
              color: '#475569',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              borderRadius: '8px',
              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
            }}
          >
            צור קשר עם התמיכה
          </Button>
        </Box>

        {/* Quick links */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {[
            { icon: 'dashboard', label: 'לוח בקרה', desc: 'נהל את המשימות שלך', path: '/' },
            { icon: 'schedule', label: 'מעקב זמן', desc: 'צפה בדיווחי הנוכחות', path: '/time-tracking' },
            { icon: 'settings', label: 'הגדרות חשבון', desc: 'עדכן את פרטי הפרופיל', path: '/profile' },
          ].map((link) => (
            <Box
              key={link.path}
              onClick={() => navigate(link.path)}
              sx={{
                bgcolor: 'white',
                borderRadius: '12px',
                p: 3,
                textAlign: 'center',
                width: 180,
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderColor: '#cbd5e1' },
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#2d7b95', marginBottom: 8, display: 'block' }}>{link.icon}</span>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>{link.label}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{link.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 3, borderTop: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          TimeTask 2024 ©. כל הזכויות שמורות.
        </Typography>
      </Box>
    </Box>
  )
}

export default NotFoundPage
