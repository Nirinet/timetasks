import React from 'react'
import Chip from '@mui/material/Chip'
import { TaskStatus, STATUS_COLORS } from '@/types'
import { getStatusLabel } from '@/utils/formatters'

interface StatusChipProps {
  status: TaskStatus
  size?: 'small' | 'medium'
}

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  return (
    <Chip
      label={getStatusLabel(status)}
      size={size}
      sx={{
        bgcolor: STATUS_COLORS[status],
        color: '#fff',
        fontWeight: 500,
      }}
    />
  )
}

export default StatusChip
