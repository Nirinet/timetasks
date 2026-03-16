import React from 'react'
import Chip from '@mui/material/Chip'
import { TaskStatus, STATUS_COLORS } from '@/types'
import { getStatusLabel } from '@/utils/formatters'

interface StatusChipProps {
  status: TaskStatus
  size?: 'small' | 'medium'
}

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#64748b' }
  return (
    <Chip
      label={getStatusLabel(status)}
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

export default StatusChip
