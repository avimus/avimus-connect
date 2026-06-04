'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

interface ApiKey {
  id: string
  name: string
  key: string
  scope: string
  createdBy: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

const docsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '/api/docs')
const scopeLabel: Record<string, string> = { read: 'Leitura', full: 'Completo' }
const scopeColor: Record<string, string> = { read: '#EAB308', full: '#775EFC' }

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', scope: 'read' as 'read' | 'full' })
  const [formError, setFormError] = useState('')
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => api.get<{ data: ApiKey[] }>('/admin/api-keys'),
  })

  const createMutation = useMutation({
    mutationFn: (body: { name: string; scope: string }) => api.post<ApiKey>('/admin/api-keys', body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
      setShowModal(false)
      setForm({ name: '', scope: 'read' })
      setNewKey(created)
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/api-keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'api-keys'] }),
    onError: (e: Error) => alert(e.message),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    createMutation.mutate(form)
  }

  function handleCopy() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">API Keys</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Gerencie as chaves de acesso à API externa
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--accent)' }}>
            Docs Ávimus Connect →
          </a>
          <a href="http://34.171.150.35:21465/api-docs/#/" target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--accent)' }}>
            Docs WPPConnect →
          </a>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nova API Key</button>
        </div>
      </div>

      {newKey && (
        <div className="glass-card p-4 mb-6" style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#22C55E' }}>API Key criada com sucesso</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Copie agora — este token não será exibido novamente.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg text-xs break-all" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {newKey.key}
            </code>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(119,94,252,0.2)', color: copied ? '#22C55E' : 'var(--accent)' }}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
                  {['Nome', 'Escopo', 'Criado em', 'Último uso', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-subtle)' }}>
                      Nenhuma API Key criada ainda.
                    </td>
                  </tr>
                )}
                {data?.data.map((k) => (
                  <tr key={k.id} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(119,94,252,0.06)' }}>
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${scopeColor[k.scope]}22`, color: scopeColor[k.scope] }}>
                        {scopeLabel[k.scope] ?? k.scope}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(k.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm('Revogar esta API Key?')) revokeMutation.mutate(k.id) }}
                        className="text-xs"
                        style={{ color: '#EF4444' }}
                        disabled={revokeMutation.isPending}
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Nova API Key</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                className="input-dark"
                placeholder="Nome (ex: Integração N8N)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <select
                className="input-dark"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as 'read' | 'full' })}
              >
                <option value="read">Leitura (read)</option>
                <option value="full">Completo (full)</option>
              </select>
              {formError && <p className="text-sm" style={{ color: '#EF4444' }}>{formError}</p>}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
                  onClick={() => { setShowModal(false); setFormError('') }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
