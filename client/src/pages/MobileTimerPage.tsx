import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  AppBar,
  Toolbar,
  alpha,
} from '@mui/material'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ─────────────────────────────────────────────────
interface ActiveTimer {
  id: string
  startTime: string
  description?: string
  runningDuration?: number
  task: {
    id?: string
    title: string
    project: { name: string }
  }
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  project: { id?: string; name: string }
}

interface Project {
  id: string
  name: string
}

// ─── Priority helpers ──────────────────────────────────────
const priorityConfig: Record<string, { label: string; color: string }> = {
  URGENT_IMPORTANT: { label: 'דחוף', color: '#ef4444' },
  IMPORTANT: { label: 'חשוב', color: '#f97316' },
  NORMAL: { label: 'רגיל', color: '#2d7b95' },
  LOW: { label: 'נמוך', color: '#94a3b8' },
}

const statusLabels: Record<string, string> = {
  NEW: 'חדש',
  IN_PROGRESS: 'בביצוע',
  WAITING_CLIENT: 'ממתין ללקוח',
  COMPLETED: 'הושלם',
}

// ─── Timer Display Component ──────────────────────────────
const LiveTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      )
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <Typography
      sx={{
        fontFamily: '"Inter", monospace',
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#2d7b95',
        letterSpacing: '0.05em',
        direction: 'ltr',
        textAlign: 'center',
      }}
    >
      {elapsed}
    </Typography>
  )
}

// ─── Main Page Component ──────────────────────────────────
const MobileTimerPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data state
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  // New task dialog
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProject, setNewTaskProject] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Loading states for start/stop
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null)
  const [stoppingTimerId, setStoppingTimerId] = useState<string | null>(null)

  // Screen Wake Lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // ─── Data Fetching ────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [timersRes, tasksRes, projectsRes] = await Promise.all([
        api.get('/time/active'),
        api.get('/tasks'),
        api.get('/projects'),
      ])
      setActiveTimers(timersRes.data.data?.activeTimers || [])
      const allTasks = tasksRes.data.data?.tasks || []
      // Filter out completed tasks
      setTasks(allTasks.filter((t: Task) => t.status !== 'COMPLETED'))
      setProjects(projectsRes.data.data?.projects || projectsRes.data.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.error('שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Screen Wake Lock ─────────────────────────────────
  useEffect(() => {
    const requestWakeLock = async () => {
      if (activeTimers.length > 0 && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch (err) {
          // Wake lock request failed (e.g., low battery)
        }
      } else if (activeTimers.length === 0 && wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
    requestWakeLock()
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [activeTimers.length])

  // ─── Start Timer ──────────────────────────────────────
  const handleStart = async (taskId: string) => {
    if (activeTimers.length >= 3) {
      toast.error('מקסימום 3 טיימרים פעילים')
      return
    }
    setStartingTaskId(taskId)
    try {
      await api.post('/time/start', { taskId })
      toast.success('טיימר הופעל')
      await fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'שגיאה בהפעלת טיימר')
    } finally {
      setStartingTaskId(null)
    }
  }

  // ─── Stop Timer ───────────────────────────────────────
  const handleStop = async (timerId: string) => {
    setStoppingTimerId(timerId)
    try {
      await api.post(`/time/stop/${timerId}`)
      toast.success('טיימר נעצר')
      await fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'שגיאה בעצירת טיימר')
    } finally {
      setStoppingTimerId(null)
    }
  }

  // ─── Create Task + Start Timer ────────────────────────
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskProject) {
      toast.error('יש למלא כותרת ופרויקט')
      return
    }
    setCreating(true)
    try {
      const res = await api.post('/tasks', {
        title: newTaskTitle.trim(),
        projectId: newTaskProject,
        description: newTaskDesc.trim() || undefined,
      })
      const newTask = res.data.data?.task || res.data.data
      if (newTask?.id && activeTimers.length < 3) {
        await api.post('/time/start', { taskId: newTask.id })
        toast.success('משימה נוצרה וטיימר הופעל')
      } else {
        toast.success('משימה נוצרה בהצלחה')
      }
      setNewTaskOpen(false)
      setNewTaskTitle('')
      setNewTaskProject('')
      setNewTaskDesc('')
      await fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'שגיאה ביצירת משימה')
    } finally {
      setCreating(false)
    }
  }

  // ─── Filtered Tasks ───────────────────────────────────
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !search || task.title.toLowerCase().includes(search.toLowerCase())
    const matchesProject = !projectFilter || task.project?.id === projectFilter
    return matchesSearch && matchesProject
  })

  // Check if a task already has an active timer
  const activeTaskIds = new Set(activeTimers.map((t) => t.task?.id).filter(Boolean))
  const maxTimersReached = activeTimers.length >= 3

  // ─── Loading State ────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f8fafc',
        }}
      >
        <CircularProgress sx={{ color: '#2d7b95' }} />
      </Box>
    )
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        direction: 'rtl',
        pb: 10, // space for FAB
      }}
    >
      {/* ── App Bar ──────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#2d7b95',
          borderBottom: '1px solid',
          borderColor: alpha('#000', 0.1),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 28, color: 'white' }}
            >
              timer
            </span>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: 'white', fontSize: '1.1rem' }}
            >
              TimeTask
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              onClick={fetchData}
              sx={{ color: 'white' }}
              size="small"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                refresh
              </span>
            </IconButton>
            <IconButton
              onClick={() => navigate('/')}
              sx={{ color: 'white' }}
              size="small"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                dashboard
              </span>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        {/* ── Active Timers Section ──────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: '#2d7b95' }}
            >
              schedule
            </span>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
              טיימרים פעילים
            </Typography>
            <Chip
              label={`${activeTimers.length}/3`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: activeTimers.length >= 3 ? '#fee2e2' : alpha('#2d7b95', 0.1),
                color: activeTimers.length >= 3 ? '#dc2626' : '#2d7b95',
              }}
            />
          </Box>

          {activeTimers.length === 0 ? (
            <Card
              elevation={0}
              sx={{
                border: '2px dashed',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                bgcolor: 'transparent',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3, '&:last-child': { pb: 3 } }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 36, color: '#cbd5e1' }}
                >
                  timer_off
                </span>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mt: 1 }}>
                  אין טיימרים פעילים
                </Typography>
                <Typography sx={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                  לחץ ▶ על משימה להתחלת תזמון
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {activeTimers.map((timer) => (
                <Card
                  key={timer.id}
                  elevation={0}
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: alpha('#2d7b95', 0.2),
                    bgcolor: alpha('#2d7b95', 0.03),
                    overflow: 'visible',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <LiveTimer startTime={timer.startTime} />
                      <IconButton
                        onClick={() => handleStop(timer.id)}
                        disabled={stoppingTimerId === timer.id}
                        sx={{
                          bgcolor: '#ef4444',
                          color: 'white',
                          width: 40,
                          height: 40,
                          '&:hover': { bgcolor: '#dc2626' },
                          '&.Mui-disabled': { bgcolor: '#fca5a5' },
                        }}
                      >
                        {stoppingTimerId === timer.id ? (
                          <CircularProgress size={20} sx={{ color: 'white' }} />
                        ) : (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 20 }}
                          >
                            stop
                          </span>
                        )}
                      </IconButton>
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#1e293b',
                        mb: 0.25,
                      }}
                      noWrap
                    >
                      {timer.task?.title}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.75rem', color: '#64748b' }}
                      noWrap
                    >
                      {timer.task?.project?.name}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* ── Tasks Section ──────────────────────────── */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: '#2d7b95' }}
            >
              task_alt
            </span>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
              המשימות שלי
            </Typography>
            <Chip
              label={filteredTasks.length}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: alpha('#2d7b95', 0.1),
                color: '#2d7b95',
              }}
            />
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              placeholder="חיפוש משימה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: 'white',
                  fontSize: '0.875rem',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: '#94a3b8' }}
                    >
                      search
                    </span>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: 'white',
                  fontSize: '0.875rem',
                },
              }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">כל הפרויקטים</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 48, color: '#e2e8f0' }}
              >
                inbox
              </span>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mt: 1 }}>
                {search || projectFilter ? 'לא נמצאו משימות' : 'אין משימות פעילות'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredTasks.map((task) => {
                const isTimerActive = activeTaskIds.has(task.id)
                const isStarting = startingTaskId === task.id
                const priority = priorityConfig[task.priority] || priorityConfig.NORMAL

                return (
                  <Card
                    key={task.id}
                    elevation={0}
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: isTimerActive
                        ? alpha('#2d7b95', 0.3)
                        : '#e2e8f0',
                      bgcolor: isTimerActive
                        ? alpha('#2d7b95', 0.03)
                        : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 1.5,
                        '&:last-child': { pb: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      {/* Play/Active button */}
                      <IconButton
                        onClick={() => !isTimerActive && handleStart(task.id)}
                        disabled={isTimerActive || maxTimersReached || isStarting}
                        sx={{
                          width: 44,
                          height: 44,
                          flexShrink: 0,
                          bgcolor: isTimerActive
                            ? alpha('#2d7b95', 0.1)
                            : maxTimersReached
                            ? '#f1f5f9'
                            : '#2d7b95',
                          color: isTimerActive
                            ? '#2d7b95'
                            : maxTimersReached
                            ? '#cbd5e1'
                            : 'white',
                          '&:hover': {
                            bgcolor: isTimerActive
                              ? alpha('#2d7b95', 0.15)
                              : '#256a80',
                          },
                          '&.Mui-disabled': {
                            bgcolor: isTimerActive
                              ? alpha('#2d7b95', 0.1)
                              : '#f1f5f9',
                            color: isTimerActive ? '#2d7b95' : '#cbd5e1',
                          },
                        }}
                      >
                        {isStarting ? (
                          <CircularProgress size={20} sx={{ color: 'white' }} />
                        ) : isTimerActive ? (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 22 }}
                          >
                            timer
                          </span>
                        ) : (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 22 }}
                          >
                            play_arrow
                          </span>
                        )}
                      </IconButton>

                      {/* Task details */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#1e293b',
                            lineHeight: 1.3,
                          }}
                          noWrap
                        >
                          {task.title}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            mt: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            sx={{ fontSize: '0.75rem', color: '#64748b' }}
                            noWrap
                          >
                            {task.project?.name}
                          </Typography>
                          <Box
                            sx={{
                              width: 3,
                              height: 3,
                              borderRadius: '50%',
                              bgcolor: '#cbd5e1',
                              flexShrink: 0,
                            }}
                          />
                          <Chip
                            label={priority.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: alpha(priority.color, 0.1),
                              color: priority.color,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                          <Chip
                            label={statusLabels[task.status] || task.status}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              bgcolor: '#f1f5f9',
                              color: '#64748b',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── FAB — New Task ────────────────────────────── */}
      <Fab
        onClick={() => setNewTaskOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          bgcolor: '#2d7b95',
          color: 'white',
          '&:hover': { bgcolor: '#256a80' },
          width: 56,
          height: 56,
          boxShadow: '0 4px 14px rgba(45,123,149,0.4)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          add
        </span>
      </Fab>

      {/* ── New Task Dialog ───────────────────────────── */}
      <Dialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: '16px', direction: 'rtl' },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 22, color: '#2d7b95' }}
          >
            add_task
          </span>
          משימה חדשה + טיימר
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="כותרת משימה"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              fullWidth
              size="small"
              required
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            />
            <TextField
              select
              label="פרויקט"
              value={newTaskProject}
              onChange={(e) => setNewTaskProject(e.target.value)}
              fullWidth
              size="small"
              required
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="תיאור (אופציונלי)"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setNewTaskOpen(false)}
            sx={{ borderRadius: '8px', color: '#64748b' }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleCreateTask}
            variant="contained"
            disabled={creating || !newTaskTitle.trim() || !newTaskProject}
            startIcon={
              creating ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  play_arrow
                </span>
              )
            }
            sx={{
              borderRadius: '8px',
              bgcolor: '#2d7b95',
              '&:hover': { bgcolor: '#256a80' },
              fontWeight: 600,
            }}
          >
            {creating ? 'יוצר...' : 'צור והפעל טיימר'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MobileTimerPage
