import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserInfo } from '../types'

interface AuthContextType {
  user: UserInfo | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check session on mount
    fetch('/auth/session', {
      credentials: 'include' // Include cookies in request
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch(err => {
        console.error('Session check failed:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed')
      }
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await fetch('/auth/logout', {
        method: 'GET',
        credentials: 'include' // Include cookies in request
      })
      setUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
