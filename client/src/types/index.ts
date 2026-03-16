// User types
export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CLIENT'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  isActive: boolean
  joinDate: string
  lastLogin?: string
  emailNotifications: boolean
  timerAlerts: boolean
  language: string
  avatar?: string
  clientEntityId?: string | null
  clientEntity?: {
    id: string
    name: string
  } | null
}

// Client types
export interface Client {
  id: string
  name: string
  contactPerson: string
  phone?: string
  email?: string
  address?: string
  joinDate: string
  isActive: boolean
  notes?: string
  createdBy: {
    firstName: string
    lastName: string
  }
  projects?: Project[]
  _count?: {
    projects: number
  }
}

// Project types
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'

export interface ProjectClientEntry {
  id: string
  projectId: string
  clientId: string
  isPrimary: boolean
  assignedAt: string
  assignedBy: string
  client: {
    id: string
    name: string
    contactPerson: string
  }
}

export interface ProjectAssignment {
  id: string
  userId: string
  projectId: string
  assignedAt: string
  assignedBy: string
  user: {
    id: string
    firstName: string
    lastName: string
    role: UserRole
  }
}

export interface Project {
  id: string
  name: string
  description?: string
  startDate: string
  targetDate?: string
  status: ProjectStatus
  hoursBudget?: number
  isTemplate: boolean
  clients: ProjectClientEntry[]
  createdBy: {
    firstName: string
    lastName: string
  }
  assignedUsers?: ProjectAssignment[]
  tasks?: Task[]
  comments?: Comment[]
  _count?: {
    tasks: number
  }
}

// Task types
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'COMPLETED'
export type Priority = 'URGENT_IMPORTANT' | 'IMPORTANT' | 'NORMAL' | 'LOW'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  creationDate: string
  deadline?: string
  timeEstimate?: number
  parentTaskId?: string
  project: {
    name: string
    clients?: {
      client: {
        name: string
      }
    }[]
  }
  assignedUsers: TaskAssignment[]
  parentTask?: {
    title: string
  }
  subtasks?: Task[]
  timeRecords?: TimeRecord[]
  comments?: Comment[]
  files?: FileAttachment[]
  _count?: {
    subtasks: number
    comments: number
    timeRecords: number
  }
}

export interface TaskAssignment {
  id: string
  taskId: string
  userId?: string
  clientId?: string
  assignedAt: string
  user?: {
    firstName: string
    lastName: string
    role: UserRole
  }
  client?: {
    name: string
    contactPerson: string
  }
}

// Time tracking types
export type TimerStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export interface TimeRecord {
  id: string
  date: string
  startTime: string
  endTime?: string
  duration?: number // in minutes
  description?: string
  status: TimerStatus
  task: {
    title: string
    project: {
      name: string
    }
  }
  employee: {
    firstName: string
    lastName: string
  }
}

// Comment types
export interface Comment {
  id: string
  content: string
  taskId?: string
  projectId?: string
  author: {
    firstName: string
    lastName: string
    role: UserRole
  }
  files?: FileAttachment[]
  createdAt: string
  updatedAt: string
}

// File types
export interface FileAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  version: number
  taskId?: string
  commentId?: string
  uploadedBy: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

// Alert types
export type AlertType =
  | 'NEW_TASK'
  | 'STATUS_CHANGE'
  | 'NEW_COMMENT'
  | 'TASK_ASSIGNMENT'
  | 'DEADLINE_APPROACHING'
  | 'DEADLINE_EXCEEDED'
  | 'ACTIVE_TIMER'
  | 'NEW_FILE'
  | 'PRIORITY_CHANGE'

export interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  isRead: boolean
  sender?: {
    firstName: string
    lastName: string
  }
  taskId?: string
  projectId?: string
  createdAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// Filter and sort types
export interface TaskFilters {
  projectId?: string
  status?: TaskStatus
  priority?: Priority
  assignedTo?: string
  search?: string
}

export interface TimeFilters {
  taskId?: string
  employeeId?: string
  startDate?: string
  endDate?: string
}

// Report types
export interface HoursReport {
  timeRecords: TimeRecord[]
  summary: {
    totalHours: number
    byProject: Record<string, number>
    byEmployee: Record<string, number>
  }
}

export interface ProjectReport {
  project: {
    id: string
    name: string
    client: string
    status: ProjectStatus
  }
  stats: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    newTasks: number
    waitingTasks: number
    completionPercentage: number
    estimatedHours: number
    actualHours: number
  }
}

export interface EmployeeReport {
  employee: {
    id: string
    name: string
    email: string
  }
  stats: {
    totalHours: number
    totalTasks: number
    completedTasks: number
    completionPercentage: number
    onTimePercentage: number
  }
}

// Search types
export interface SearchResult {
  tasks: {
    id: string
    title: string
    status: TaskStatus
    project: { name: string }
  }[]
  projects: {
    id: string
    name: string
    status: ProjectStatus
    clients: { client: { name: string } }[]
  }[]
  clients: {
    id: string
    name: string
    contactPerson: string
  }[]
}

// Priority colors mapping
export const PRIORITY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  URGENT_IMPORTANT: { bg: '#fee2e2', text: '#dc2626', icon: 'error' },
  IMPORTANT: { bg: '#ffedd5', text: '#ea580c', icon: 'warning' },
  NORMAL: { bg: '#fef9c3', text: '#ca8a04', icon: 'remove' },
  LOW: { bg: '#dbeafe', text: '#2563eb', icon: 'arrow_downward' },
} as const

// Legacy flat priority colors for backward compat
export const PRIORITY_COLORS_FLAT: Record<string, string> = {
  URGENT_IMPORTANT: '#ef4444',
  IMPORTANT: '#f97316',
  NORMAL: '#eab308',
  LOW: '#3b82f6',
} as const

// Status colors mapping
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW: { bg: 'rgba(45,123,149,0.15)', text: '#2d7b95' },
  IN_PROGRESS: { bg: '#dbeafe', text: '#1d4ed8' },
  WAITING_CLIENT: { bg: '#ffedd5', text: '#c2410c' },
  COMPLETED: { bg: '#d1fae5', text: '#047857' },
} as const

// Legacy flat status colors for backward compat
export const STATUS_COLORS_FLAT: Record<string, string> = {
  NEW: '#2d7b95',
  IN_PROGRESS: '#3b82f6',
  WAITING_CLIENT: '#f97316',
  COMPLETED: '#10b981',
} as const