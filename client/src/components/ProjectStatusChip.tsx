import React from 'react'
import Chip from '@mui/material/Chip'
import { ProjectStatus } from '@/types'
import { getProjectStatusLabel } from '@/utils/formatters'

const colorMap: Record<ProjectStatus, 'success' | 'warning' | 'info'> = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'info',
}

interface ProjectStatusChipProps {
  status: ProjectStatus
  size?: 'small' | 'medium'
}

const ProjectStatusChip: React.FC<ProjectStatusChipProps> = ({ status, size = 'small' }) => {
  return (
    <Chip
      label={getProjectStatusLabel(status)}
      color={colorMap[status]}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  )
}

export default ProjectStatusChip
