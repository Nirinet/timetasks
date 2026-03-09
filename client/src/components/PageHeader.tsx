import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

interface PageHeaderProps {
  title: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ReactElement
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  actionLabel,
  onAction,
  actionIcon = <AddIcon />,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
      }}
    >
      <Typography variant="h4" fontWeight={600}>
        {title}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={actionIcon}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export default PageHeader
