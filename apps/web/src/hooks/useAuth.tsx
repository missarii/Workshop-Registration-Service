import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { User, Role } from '../types'

interface AuthContextType {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'> | null
  token: string | null
  login: (token: string, user: Pick<User, 'id' | 'name' | 'email' | 'role'>) => void
  logout: () => void
  isAuthenticated: boolean
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadAuth() {
  try {
    const token = localStorage.getItem('token')
    const rawUser = localStorage.getItem('user')
    const user = rawUser ? JSON.parse(rawUser) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(loadAuth)

  const login = useCallback(
    (token: string, user: Pick<User, 'id' | 'name' | 'email' | 'role'>) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setAuth({ token, user })
    },
    []
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuth({ token: null, user: null })
  }, [])

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!auth.user) return false
      return roles.includes(auth.user.role)
    },
    [auth.user]
  )

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        token: auth.token,
        login,
        logout,
        isAuthenticated: !!auth.token && !!auth.user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
