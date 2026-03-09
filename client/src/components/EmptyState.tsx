import React from 'react'
import { Box, Typography } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

interface EmptyStateProps {
  icon?: React.ReactElement
  title: string
  subtitle?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ mb: 2, '& .MuiSvgIcon-root': { fontSize: 64, opacity: 0.4 } }}>
        {icon || <InboxIcon />}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

export default EmptyState
