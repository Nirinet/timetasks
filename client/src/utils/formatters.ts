import { TaskStatus, Priority, ProjectStatus, UserRole } from '@/types'

// Status labels in Hebrew
export const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'חדש',
  IN_PROGRESS: 'בביצוע',
  WAITING_CLIENT: 'ממתין ללקוח',
  COMPLETED: 'הושלם',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT_IMPORTANT: 'דחוף וחשוב',
  IMPORTANT: 'חשוב',
  NORMAL: 'רגיל',
  LOW: 'נמוך',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'פעיל',
  ON_HOLD: 'מושהה',
  COMPLETED: 'הושלם',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'מנהל',
  EMPLOYEE: 'עובד',
  CLIENT: 'לקוח',
}

// Format duration in minutes to HH:MM string
export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes && minutes !== 0) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

// Format date to Hebrew locale string
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('he-IL')
}

// Format datetime to Hebrew locale string
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('he-IL')
}

// Format time only (HH:MM)
export function formatTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Get status label
export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status] || status
}

// Get priority label
export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] || priority
}

// Get project status label
export function getProjectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status] || status
}

// Get role label
export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] || role
}
