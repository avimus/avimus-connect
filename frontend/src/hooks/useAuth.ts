'use client'
import { useState, useEffect, useCallback } from 'react'
import { decodeJwt } from 'jose'
import { setToken, clearToken } from '@/services/api'

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'client'
  tenantId: string | null
}

interface JwtClaims {
  sub: string
  email: string
  tenantId: string | null
  role: 'admin' | 'client'
  exp: number
}

function decodeUser(token: string): AuthUser | null {
  try {
    const claims = decodeJwt(token) as JwtClaims
    if (claims.exp && claims.exp * 1000 < Date.now()) return null
    return { id: claims.sub, email: claims.email ?? '', role: claims.role, tenantId: claims.tenantId }
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('avimus_token')
    if (token) {
      const decoded = decodeUser(token)
      setUser(decoded)
    }
    setLoading(false)
  }, [])

  const login = useCallback((token: string, userData: Omit<AuthUser, 'id'> & { id: string }) => {
    setToken(token)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return { user, loading, login, logout }
}
