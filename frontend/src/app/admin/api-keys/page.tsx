'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

interface InstanceSummary {
  id: string
  name: string
  status: string
  wppSessionId: string
}

interface ApiKey {
  id: string
  name: string
  key: string
  scope: string
  createdBy: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  allowedInstances: { instanceId: string; instance: { id: string; name: string; status: string } }[]
}

const docsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '/api/docs')
const scopeLabel: Record<string, string> = { read: 'Leitura', full: 'Completo' }
const scopeColor: Record<string, string> = { read: '#EAB308', full: '#775EFC' }
const statusColor: Record<string, string> = { online: '#22C55E', offline: '#EF4444', waiting_qr: '#EAB308', error: '#EF4444', unknown: '#6B7280' }

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({ name: '', scope: 'read' as 'read' | 'full' })
  const [formError, setFormError] = useState('')
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const [linkingKey, setLinkingKey] = useState<ApiKey | null>(null)
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([])
  const [instanceSearch, setInstanceSearch] = useState('')
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<'all' | 'online' | 'offline'>('online')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => api.get<{ data: ApiKey[] }>('/admin/api-keys'),
  })

  const { data: instancesData } = useQuery({
    queryKey: ['admin', 'instances-all'],
    queryFn: () => api.get<{ data: InstanceSummary[]; total: number }>('/admin/instances?limit=100'),
    enabled: !!linkingKey,
  })

  const createMutation = useMutation({
    mutationFn: (body: { name: string; scope: string }) => api.post<ApiKey>('/admin/api-keys', body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
      setShowCreateModal(false)
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

  const linkMutation = useMutation({
    mutationFn: ({ id, instanceIds }: { id: string; instanceIds: string[] }) =>
      api.put(`/admin/api-keys/${id}/instances`, { instanceIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
      setLinkingKey(null)
    },
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

  function openLinkModal(key: ApiKey) {
    setLinkingKey(key)
    setSelectedInstanceIds(key.allowedInstances.map((r) => r.instanceId))
    setInstanceSearch('')
    setInstanceStatusFilter('online')
  }

  function toggleInstance(id: string) {
    setSelectedInstanceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSaveLinks() {
    if (!linkingKey) return
    linkMutation.mutate({ id: linkingKey.id, instanceIds: selectedInstanceIds })
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
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Nova API Key</button>
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
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
                  {['Nome', 'Escopo', 'Instâncias', 'Criado em', 'Último uso', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-subtle)' }}>
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
                    <td className="px-4 py-3">
                      {k.allowedInstances.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Todas</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(119,94,252,0.15)', color: 'var(--accent)' }}>
                          {k.allowedInstances.length} vinculada{k.allowedInstances.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(k.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openLinkModal(k)}
                          className="text-xs"
                          style={{ color: 'var(--accent)' }}
                        >
                          Vincular
                        </button>
                        <button
                          onClick={() => { if (confirm('Revogar esta API Key?')) revokeMutation.mutate(k.id) }}
                          className="text-xs"
                          style={{ color: '#EF4444' }}
                          disabled={revokeMutation.isPending}
                        >
                          Revogar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: criar nova key */}
      {showCreateModal && (
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
                  onClick={() => { setShowCreateModal(false); setFormError('') }}
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

      {/* Modal: vincular instâncias */}
      {linkingKey && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Vincular Instâncias</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{linkingKey.name}</span>
              {' '}— selecione as instâncias que esta key pode acessar.
              {' '}<span style={{ color: 'var(--text-subtle)' }}>Nenhuma selecionada = acesso a todas.</span>
            </p>

            {/* busca + filtro de status */}
            <div className="flex gap-2 mb-3">
              <input
                className="input-dark flex-1 text-sm"
                placeholder="Buscar por nome..."
                value={instanceSearch}
                onChange={(e) => setInstanceSearch(e.target.value)}
              />
              <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border-sidebar)' }}>
                {(['online', 'all', 'offline'] as const).map((s) => {
                  const labels = { online: 'Online', all: 'Todas', offline: 'Offline' }
                  const active = instanceStatusFilter === s
                  return (
                    <button
                      key={s}
                      onClick={() => setInstanceStatusFilter(s)}
                      className="px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: active ? (s === 'online' ? 'rgba(34,197,94,0.2)' : s === 'offline' ? 'rgba(239,68,68,0.2)' : 'rgba(119,94,252,0.2)') : 'transparent',
                        color: active ? (s === 'online' ? '#22C55E' : s === 'offline' ? '#EF4444' : 'var(--accent)') : 'var(--text-subtle)',
                      }}
                    >
                      {labels[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 mb-4">
              {!instancesData && (
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Carregando instâncias...</p>
              )}
              {(() => {
                const filtered = (instancesData?.data ?? []).filter((inst) => {
                  const matchSearch = inst.name.toLowerCase().includes(instanceSearch.toLowerCase()) ||
                    inst.wppSessionId.toLowerCase().includes(instanceSearch.toLowerCase())
                  const matchStatus = instanceStatusFilter === 'all' ||
                    (instanceStatusFilter === 'online' && inst.status === 'online') ||
                    (instanceStatusFilter === 'offline' && inst.status !== 'online')
                  return matchSearch && matchStatus
                })

                if (instancesData && filtered.length === 0) {
                  return <p className="text-sm py-4 text-center" style={{ color: 'var(--text-subtle)' }}>Nenhuma instância encontrada.</p>
                }

                return filtered.map((inst) => {
                  const checked = selectedInstanceIds.includes(inst.id)
                  return (
                    <label
                      key={inst.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                      style={{
                        background: checked ? 'rgba(119,94,252,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${checked ? 'rgba(119,94,252,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInstance(inst.id)}
                        className="accent-purple-500 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inst.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{inst.wppSessionId}</p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: `${statusColor[inst.status] ?? '#6B7280'}22`,
                          color: statusColor[inst.status] ?? '#6B7280',
                        }}
                      >
                        {inst.status}
                      </span>
                    </label>
                  )
                })
              })()}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--text-subtle)' }}
                onClick={() => setSelectedInstanceIds([])}
              >
                Limpar seleção
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
                  onClick={() => setLinkingKey(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveLinks}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
