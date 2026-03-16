import React from 'react'
import { Box, Typography, Button } from '@mui/material'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ReactElement
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 4,
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={actionIcon || <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>}
          onClick={onAction}
          sx={{
            bgcolor: '#2d7b95',
            fontWeight: 700,
            fontSize: '0.875rem',
            px: 2.5,
            py: 1,
            borderRadius: '8px',
            boxShadow: '0 1px 2px 0 rgba(45,123,149,0.2)',
            '&:hover': {
              bgcolor: 'rgba(45,123,149,0.9)',
              boxShadow: '0 4px 6px -1px rgba(45,123,149,0.3)',
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export default PageHeader
