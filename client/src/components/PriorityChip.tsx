import React from 'react'
import Chip from '@mui/material/Chip'
import { Priority, PRIORITY_COLORS } from '@/types'
import { getPriorityLabel } from '@/utils/formatters'

interface PriorityChipProps {
  priority: Priority
  size?: 'small' | 'medium'
}

const PriorityChip: React.FC<PriorityChipProps> = ({ priority, size = 'small' }) => {
  return (
    <Chip
      label={getPriorityLabel(priority)}
      size={size}
      sx={{
        bgcolor: PRIORITY_COLORS[priority],
        color: priority === 'NORMAL' ? '#333' : '#fff',
        fontWeight: 500,
      }}
    />
  )
}

export default PriorityChip
