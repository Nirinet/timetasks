import React from 'react'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { Priority, PRIORITY_COLORS } from '@/types'
import { getPriorityLabel } from '@/utils/formatters'

interface PriorityChipProps {
  priority: Priority
  size?: 'small' | 'medium'
}

const PriorityChip: React.FC<PriorityChipProps> = ({ priority, size = 'small' }) => {
  const colors = PRIORITY_COLORS[priority] || { bg: '#f1f5f9', text: '#64748b', icon: 'remove' }
  return (
    <Chip
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: colors.text }}>{colors.icon}</span>
          {getPriorityLabel(priority)}
        </Box>
      }
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        border: 'none',
      }}
    />
  )
}

export default PriorityChip
