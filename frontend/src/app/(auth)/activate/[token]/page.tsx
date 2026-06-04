'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, setToken } from '@/services/api'

interface ActivateInfo { valid: boolean; tenantName: string; email: string }
interface ActivateResponse { token: string; user: { role: string } }

export default function ActivatePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<ActivateInfo | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<ActivateInfo>(`/auth/activate?token=${token}`)
      .then(setInfo)
      .catch(() => setInvalid(true))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== passwordConfirm) { setError('Senhas não coincidem'); return }
    setError('')
    setLoading(true)
    try {
      const data = await api.post<ActivateResponse>('/auth/activate', { token, password, passwordConfirm })
      setToken(data.token)
      router.push('/client/instances')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao ativar conta')
    } finally {
      setLoading(false)
    }
  }

  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 text-center">
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#EF4444' }}>Link Inválido</h2>
        <p style={{ color: 'rgba(240,240,255,0.5)' }}>Este convite expirou ou já foi utilizado.</p>
      </div>
    </div>
  )

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'rgba(240,240,255,0.5)' }}>Verificando convite...</p>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1" style={{ color: '#775EFC' }}>Ativar Conta</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(240,240,255,0.5)' }}>{info.tenantName}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(240,240,255,0.7)' }}>Nova Senha</label>
            <input type="password" className="input-dark" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(240,240,255,0.7)' }}>Confirmar Senha</label>
            <input type="password" className="input-dark" placeholder="Repita a senha" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Ativando...' : 'Ativar Conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
