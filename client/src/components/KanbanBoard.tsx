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

import { Task, TaskStatus, STATUS_COLORS } from '@/types'
import PriorityChip from '@/components/PriorityChip'
import { formatDate } from '@/utils/formatters'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'NEW', label: 'חדש' },
  { id: 'IN_PROGRESS', label: 'בביצוע' },
  { id: 'WAITING_CLIENT', label: 'ממתין ללקוח' },
  { id: 'COMPLETED', label: 'הושלם' },
]

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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 1,
        cursor: 'grab',
        '&:hover': { boxShadow: 3 },
        '&:active': { cursor: 'grabbing' },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }} noWrap>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {task.project?.name}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <PriorityChip priority={task.priority} />
          {task.deadline && (
            <Typography
              variant="caption"
              color={new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? 'error' : 'text.secondary'}
            >
              {formatDate(task.deadline)}
            </Typography>
          )}
        </Box>
        {task.assignedUsers && task.assignedUsers.length > 0 && (
          <AvatarGroup max={3} sx={{ mt: 1, justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
            {task.assignedUsers.map((a) => (
              <Avatar key={a.id} sx={{ bgcolor: 'primary.main' }}>
                {(a.user?.firstName || a.client?.name || '?')[0]}
              </Avatar>
            ))}
          </AvatarGroup>
        )}
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

    // Determine target column from the over element
    let targetStatus: TaskStatus | null = null

    // Check if dropped on a column directly
    const overId = over.id as string
    const isColumn = COLUMNS.some(c => c.id === overId)
    if (isColumn) {
      targetStatus = overId as TaskStatus
    } else {
      // Dropped on another task - find its status
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
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter(t => t.status === col.id)
          return (
            <Box
              key={col.id}
              sx={{
                minWidth: 280,
                maxWidth: 320,
                flex: '1 0 280px',
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {col.label}
                </Typography>
                <Chip
                  label={columnTasks.length}
                  size="small"
                  sx={{
                    bgcolor: STATUS_COLORS[col.id],
                    color: '#fff',
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              </Box>
              <SortableContext
                id={col.id}
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Box sx={{ minHeight: 100 }}>
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
          <Card sx={{ boxShadow: 6, opacity: 0.9, width: 280 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" fontWeight={500}>{activeTask.title}</Typography>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
