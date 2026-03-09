import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Tooltip,
  Paper,
} from '@mui/material'

import { Task, STATUS_COLORS } from '@/types'
import { getStatusLabel } from '@/utils/formatters'

interface GanttChartProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick }) => {
  // Calculate date range for the chart
  const { startDate, endDate, totalDays, tasksWithDates } = useMemo(() => {
    const now = new Date()
    let minDate = new Date(now)
    let maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + 30) // At least 30 days range

    const filteredTasks = tasks.filter(t => t.creationDate || t.deadline)

    filteredTasks.forEach((task) => {
      const created = task.creationDate ? new Date(task.creationDate) : now
      const deadline = task.deadline ? new Date(task.deadline) : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000) // Default 7 days

      if (created < minDate) minDate = new Date(created)
      if (deadline > maxDate) maxDate = new Date(deadline)
    })

    // Add padding
    minDate.setDate(minDate.getDate() - 2)
    maxDate.setDate(maxDate.getDate() + 2)

    const totalMs = maxDate.getTime() - minDate.getTime()
    const totalDays = Math.ceil(totalMs / (24 * 60 * 60 * 1000))

    const tasksWithDates = filteredTasks.map((task) => {
      const created = task.creationDate ? new Date(task.creationDate) : now
      const deadline = task.deadline ? new Date(task.deadline) : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000)
      return { ...task, _start: created, _end: deadline }
    })

    return { startDate: minDate, endDate: maxDate, totalDays, tasksWithDates }
  }, [tasks])

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: { date: Date; left: number }[] = []
    const d = new Date(startDate)
    // Move to next Sunday
    d.setDate(d.getDate() + (7 - d.getDay()) % 7)
    while (d <= endDate) {
      const dayOffset = (d.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      markers.push({
        date: new Date(d),
        left: (dayOffset / totalDays) * 100,
      })
      d.setDate(d.getDate() + 7)
    }
    return markers
  }, [startDate, endDate, totalDays])

  // Today marker
  const todayOffset = useMemo(() => {
    const now = new Date()
    const dayOffset = (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    return (dayOffset / totalDays) * 100
  }, [startDate, totalDays])

  if (tasksWithDates.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">אין משימות עם תאריכים להצגה</Typography>
      </Box>
    )
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Box sx={{ minWidth: 800 }}>
        {/* Timeline header */}
        <Box sx={{ position: 'relative', height: 32, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          {weekMarkers.map((marker, i) => (
            <Typography
              key={i}
              variant="caption"
              color="text.secondary"
              sx={{
                position: 'absolute',
                left: `${marker.left}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.65rem',
                whiteSpace: 'nowrap',
              }}
            >
              {marker.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
            </Typography>
          ))}
        </Box>

        {/* Task rows */}
        {tasksWithDates.map((task) => {
          const startOffset = (task._start.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
          const duration = (task._end.getTime() - task._start.getTime()) / (24 * 60 * 60 * 1000)
          const leftPct = (startOffset / totalDays) * 100
          const widthPct = Math.max((duration / totalDays) * 100, 1) // Minimum 1%

          return (
            <Box
              key={task.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                height: 40,
                borderBottom: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
                cursor: 'pointer',
              }}
              onClick={() => onTaskClick(task)}
            >
              {/* Task name */}
              <Box sx={{ width: 200, minWidth: 200, px: 1, borderLeft: 1, borderColor: 'divider' }}>
                <Typography variant="body2" noWrap fontSize="0.8rem">
                  {task.title}
                </Typography>
              </Box>

              {/* Gantt bar area */}
              <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
                {/* Week lines */}
                {weekMarkers.map((marker, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      left: `${marker.left}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      bgcolor: 'divider',
                    }}
                  />
                ))}

                {/* Today line */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${todayOffset}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'error.main',
                    zIndex: 2,
                  }}
                />

                {/* Task bar */}
                <Tooltip title={`${task.title} | ${getStatusLabel(task.status)}`}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 8,
                      height: 24,
                      bgcolor: STATUS_COLORS[task.status],
                      borderRadius: 1,
                      minWidth: 6,
                      opacity: 0.85,
                      '&:hover': { opacity: 1 },
                      display: 'flex',
                      alignItems: 'center',
                      px: 0.5,
                      overflow: 'hidden',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#fff',
                        fontSize: '0.65rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {widthPct > 5 ? task.title : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

export default GanttChart
