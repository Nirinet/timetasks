import React from 'react'
import Chip from '@mui/material/Chip'
import { ProjectStatus } from '@/types'
import { getProjectStatusLabel } from '@/utils/formatters'

const colorMap: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#d1fae5', text: '#047857' },
  ON_HOLD: { bg: '#ffedd5', text: '#c2410c' },
  COMPLETED: { bg: '#dbeafe', text: '#1d4ed8' },
  PLANNING: { bg: '#fef9c3', text: '#a16207' },
}

interface ProjectStatusChipProps {
  status: ProjectStatus
  size?: 'small' | 'medium'
}

const ProjectStatusChip: React.FC<ProjectStatusChipProps> = ({ status, size = 'small' }) => {
  const colors = colorMap[status] || { bg: '#f1f5f9', text: '#64748b' }
  return (
    <Chip
      label={getProjectStatusLabel(status)}
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

export default ProjectStatusChip
