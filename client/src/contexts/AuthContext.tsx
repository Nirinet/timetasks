import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, ApiResponse } from '@/types'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const response = await api.get<ApiResponse<{ user: User }>>('/auth/profile')
          if (response.data.success && response.data.data) {
            setUser(response.data.data.user)
          }
        } catch (error) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post<ApiResponse<{
        user: User
        accessToken: string
        refreshToken: string
      }>>('/auth/login', { email, password })

      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken } = response.data.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        setUser(user)

        toast.success(response.data.message || 'התחברת בהצלחה!')
        return true
      }
      return false
    } catch (error: any) {
      return false
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    toast.success('התנתקת בהצלחה')
  }

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const response = await api.put<ApiResponse<{ user: User }>>('/auth/profile', data)

      if (response.data.success && response.data.data) {
        setUser(response.data.data.user)
        toast.success(response.data.message || 'הפרופיל עודכן בהצלחה')
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}