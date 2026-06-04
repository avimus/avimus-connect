'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, setToken } from '@/services/api'

interface LoginResponse {
  token: string
  user: { role: string }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password })
      setToken(data.token)
      router.push(data.user.role === 'admin' ? '/admin/dashboard' : '/client/instances')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0F' }}>
      <div className="glass-card p-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#775EFC' }}>Ávimus Connect</h1>
          <p className="text-sm" style={{ color: 'rgba(240,240,255,0.5)' }}>Gerenciamento WhatsApp</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(240,240,255,0.7)' }}>
              Email
            </label>
            <input
              type="email"
              className="input-dark"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(240,240,255,0.7)' }}>
              Senha
            </label>
            <input
              type="password"
              className="input-dark"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#EF4444' }}>{error}</p>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
