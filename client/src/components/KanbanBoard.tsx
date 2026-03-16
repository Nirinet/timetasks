import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
} from '@mui/material'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Task, TaskStatus, PRIORITY_COLORS } from '@/types'
import { formatDate } from '@/utils/formatters'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: 'NEW', label: 'חדש', dotColor: '#3b82f6' },
  { id: 'IN_PROGRESS', label: 'בביצוע', dotColor: '#2d7b95' },
  { id: 'WAITING_CLIENT', label: 'ממתין ללקוח', dotColor: '#f97316' },
  { id: 'COMPLETED', label: 'הושלם', dotColor: '#22c55e' },
]

const priorityLabels: Record<string, { label: string; color: string; icon: string }> = {
  URGENT_IMPORTANT: { label: 'דחוף', color: '#ef4444', icon: 'priority_high' },
  IMPORTANT: { label: 'חשוב', color: '#ea580c', icon: 'warning' },
  NORMAL: { label: 'בינוני', color: '#ca8a04', icon: 'horizontal_rule' },
  LOW: { label: 'נמוך', color: '#94a3b8', icon: 'low_priority' },
}

interface KanbanCardProps {
  task: Task
  onClick: () => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const prio = priorityLabels[task.priority] || priorityLabels.NORMAL
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'COMPLETED'
  const isWaiting = task.status === 'WAITING_CLIENT'
  const isCompleted = task.status === 'COMPLETED'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      sx={{
        mb: 1.5,
        cursor: 'grab',
        borderRadius: '12px',
        border: '1px solid rgba(45,123,149,0.05)',
        borderRight: isWaiting ? '4px solid #f97316' : undefined,
        boxShadow: isWaiting ? '0 4px 6px -1px rgba(0,0,0,0.07)' : '0 1px 2px rgba(0,0,0,0.05)',
        opacity: isCompleted ? 0.75 : 1,
        '&:hover': { borderColor: 'rgba(45,123,149,0.2)' },
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Top row: tag + priority */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{
            px: 1, py: 0.25, borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700,
            bgcolor: 'rgba(45,123,149,0.1)', color: '#2d7b95',
          }}>
            {task.project?.name?.split(' ')[0] || 'כללי'}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', fontWeight: 700, color: prio.color }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{prio.icon}</span>
            {prio.label}
          </Box>
        </Box>

        {/* Title */}
        <Typography sx={{
          fontWeight: 700, fontSize: '0.875rem', mb: 0.5,
          textDecoration: isCompleted ? 'line-through' : 'none',
          textDecorationColor: '#cbd5e1',
        }}>
          {task.title}
        </Typography>

        {/* Project */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>folder</span>
          <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{task.project?.name}</Typography>
        </Box>

        {/* Footer: deadline + avatars */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', pt: 1.5 }}>
          {task.deadline ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isOverdue ? '#ef4444' : isCompleted ? '#22c55e' : '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isOverdue ? 'event_busy' : isCompleted ? 'check_circle' : 'schedule'}</span>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: isOverdue ? 700 : 400 }}>
                {isOverdue ? 'באיחור!' : formatDate(task.deadline)}
              </Typography>
            </Box>
          ) : <Box />}
          {task.assignedUsers && task.assignedUsers.length > 0 && (
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 10, border: '2px solid white', bgcolor: '#2d7b95' } }}>
              {task.assignedUsers.map((a) => (
                <Avatar key={a.id}>
                  {(a.user?.firstName || a.client?.name || '?')[0]}
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskClick, onRefresh }) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    let targetStatus: TaskStatus | null = null

    const overId = over.id as string
    const isColumn = COLUMNS.some(c => c.id === overId)
    if (isColumn) {
      targetStatus = overId as TaskStatus
    } else {
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    if (!targetStatus || targetStatus === task.status) return

    try {
      await api.put(`/tasks/${taskId}`, { status: targetStatus })
      toast.success('סטטוס המשימה עודכן')
      onRefresh()
    } catch {
      // error toast handled by api interceptor
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, minHeight: 400 }}>
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter(t => t.status === col.id)
          return (
            <Box
              key={col.id}
              sx={{
                minWidth: 300,
                width: 300,
                flex: '0 0 300px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Column Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.dotColor }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col.label}
                  </Typography>
                  <Box sx={{
                    bgcolor: '#e2e8f0', px: 1, py: 0.125, borderRadius: '4px',
                    fontSize: '0.625rem', fontWeight: 700, color: '#64748b',
                  }}>
                    {columnTasks.length}
                  </Box>
                </Box>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>more_horiz</span>
              </Box>

              {/* Cards */}
              <SortableContext
                id={col.id}
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Box sx={{ minHeight: 80 }}>
                  {columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                    />
                  ))}
                </Box>
              </SortableContext>
            </Box>
          )
        })}
      </Box>

      <DragOverlay>
        {activeTask ? (
          <Card sx={{ boxShadow: 6, opacity: 0.9, width: 300, borderRadius: '12px' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{activeTask.title}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{activeTask.project?.name}</Typography>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
