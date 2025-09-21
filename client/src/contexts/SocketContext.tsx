import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinProject: (projectId: string) => void
  leaveProject: (projectId: string) => void
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

  useEffect(() => {
    if (user) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

      const newSocket = io(SOCKET_URL, {
        auth: {
          userId: user.id,
        },
      })

      newSocket.on('connect', () => {
        setConnected(true)
        newSocket.emit('join', user.id)
        console.log('Connected to server')
      })

      newSocket.on('disconnect', () => {
        setConnected(false)
        console.log('Disconnected from server')
      })

      // Listen for real-time updates
      newSocket.on('timer_started', (data) => {
        toast.success(`טיימר הופעל עבור: ${data.taskTitle}`)
      })

      newSocket.on('timer_stopped', (data) => {
        toast.success(`טיימר נעצר עבור: ${data.taskTitle}`)
      })

      newSocket.on('task_updated', (data) => {
        toast.info(`משימה עודכנה: ${data.taskTitle}`)
      })

      newSocket.on('comment_added', (data) => {
        toast.info(`תגובה חדשה נוספה`)
      })

      newSocket.on('new_notification', (notification) => {
        toast(notification.message, {
          icon: '🔔',
          duration: 5000,
        })
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user])

  const joinProject = (projectId: string) => {
    if (socket) {
      socket.emit('join_project', projectId)
    }
  }

  const leaveProject = (projectId: string) => {
    if (socket) {
      socket.emit('leave_project', projectId)
    }
  }

  const value = {
    socket,
    connected,
    joinProject,
    leaveProject,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}