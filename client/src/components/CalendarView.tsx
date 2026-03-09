import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Paper,
  Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'

import { Task, PRIORITY_COLORS } from '@/types'

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay() // 0=Sunday
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []

    // Fill empty cells before 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Fill month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }

    return days
  }, [year, month])

  // Map tasks to dates by deadline
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((task) => {
      if (task.deadline) {
        const d = new Date(task.deadline)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (!map[key]) map[key] = []
        map[key].push(task)
      }
    })
    return map
  }, [tasks])

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {MONTHS_HE[month]} {year}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={handleToday} size="small">
            <TodayIcon />
          </IconButton>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Day Headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {DAYS_HE.map((day) => (
          <Box key={day} sx={{ textAlign: 'center', py: 0.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <Box key={`empty-${index}`} sx={{ minHeight: 100 }} />
          }

          const dateKey = `${year}-${month}-${day}`
          const dayTasks = tasksByDate[dateKey] || []

          return (
            <Paper
              key={day}
              variant="outlined"
              sx={{
                minHeight: 100,
                p: 0.5,
                bgcolor: isToday(day) ? 'primary.50' : 'background.paper',
                borderColor: isToday(day) ? 'primary.main' : 'divider',
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="caption"
                fontWeight={isToday(day) ? 700 : 400}
                color={isToday(day) ? 'primary.main' : 'text.secondary'}
                sx={{ display: 'block', mb: 0.5, textAlign: 'center' }}
              >
                {day}
              </Typography>
              {dayTasks.slice(0, 3).map((task) => (
                <Tooltip key={task.id} title={`${task.title} - ${task.project?.name}`}>
                  <Chip
                    label={task.title}
                    size="small"
                    onClick={() => onTaskClick(task)}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      mb: 0.25,
                      height: 22,
                      fontSize: '0.7rem',
                      bgcolor: PRIORITY_COLORS[task.priority],
                      color: task.priority === 'NORMAL' ? '#333' : '#fff',
                      cursor: 'pointer',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}
                  />
                </Tooltip>
              ))}
              {dayTasks.length > 3 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  +{dayTasks.length - 3} עוד
                </Typography>
              )}
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

export default CalendarView
