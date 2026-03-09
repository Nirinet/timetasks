import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinProject: (projectId: string) => void
  leaveProject: (projectId: string) => void
  reconnect: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  const connectSocket = useCallback(() => {
    if (!user) return null

    const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || ''
    const token = localStorage.getItem('accessToken')

    if (!token) {
      return null
    }

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: token,
        userId: user.id,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('join', user.id)
    })

    newSocket.on('disconnect', (reason) => {
      setConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        setTimeout(() => {
          newSocket.connect()
        }, 1000)
      }
    })

    newSocket.on('connect_error', (error) => {
      if (error.message === 'Authentication error') {
        toast.error('שגיאת אימות. אנא התחבר מחדש.')
        // Optionally logout the user
        window.location.href = '/login'
      }
    })

    // Listen for real-time updates
    newSocket.on('timer_started', (data) => {
      if (data.userId !== user.id) {
        toast.success(`טיימר הופעל עבור: ${data.taskTitle}`, {
          icon: '⏱️',
        })
      }
    })

    newSocket.on('timer_stopped', (data) => {
      if (data.userId !== user.id) {
        toast.success(`טיימר נעצר עבור: ${data.taskTitle}`, {
          icon: '⏹️',
        })
      }
    })

    newSocket.on('task_updated', (data) => {
      toast(`משימה עודכנה: ${data.taskTitle}`, {
        icon: '📝',
      })
    })

    newSocket.on('comment_added', (data) => {
      if (data.authorId !== user.id) {
        toast(`תגובה חדשה ב: ${data.taskTitle || 'משימה'}`, {
          icon: '💬',
        })
      }
    })

    newSocket.on('new_notification', (notification) => {
      toast(notification.message, {
        icon: '🔔',
        duration: 5000,
      })
    })

    return newSocket
  }, [user])

  useEffect(() => {
    if (user) {
      const newSocket = connectSocket()
      if (newSocket) {
        setSocket(newSocket)
        
        return () => {
          newSocket.disconnect()
          setSocket(null)
          setConnected(false)
        }
      }
    }
  }, [user, connectSocket])

  const joinProject = useCallback((projectId: string) => {
    if (socket && connected) {
      socket.emit('join_project', projectId)
    }
  }, [socket, connected])

  const leaveProject = useCallback((projectId: string) => {
    if (socket && connected) {
      socket.emit('leave_project', projectId)
    }
  }, [socket, connected])

  const reconnect = useCallback(() => {
    if (socket && !connected) {
      socket.connect()
    } else if (!socket && user) {
      const newSocket = connectSocket()
      if (newSocket) {
        setSocket(newSocket)
      }
    }
  }, [socket, connected, user, connectSocket])

  const value = {
    socket,
    connected,
    joinProject,
    leaveProject,
    reconnect,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}