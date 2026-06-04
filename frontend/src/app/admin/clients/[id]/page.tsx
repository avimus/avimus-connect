'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

interface Instance { id: string; name: string; wppSessionId: string; status: string; lastPolledAt: string | null }
interface Tenant { id: string; name: string; email: string; planType: string; planLimit: number | null; status: string; instances: Instance[] }

const statusColor: Record<string, string> = { online: '#22C55E', offline: '#EF4444', waiting_qr: '#EAB308', error: '#F97316', unknown: '#6B7280' }
const statusLabel: Record<string, string> = { online: 'Online', offline: 'Offline', waiting_qr: 'Aguardando QR', error: 'Erro', unknown: 'Desconhecido' }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [editError, setEditError] = useState('')

  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin', 'clients', id],
    queryFn: () => api.get<Tenant>(`/admin/clients/${id}`),
  })

  const editMutation = useMutation({
    mutationFn: (body: { name?: string; email?: string }) => api.patch(`/admin/clients/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'clients', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
      setShowEditModal(false)
    },
    onError: (e: Error) => setEditError(e.message),
  })

  const resendMutation = useMutation({
    mutationFn: () => api.post(`/admin/clients/${id}/resend-invite`, {}),
    onSuccess: () => alert('Convite reenviado com sucesso!'),
    onError: (e: Error) => alert(e.message),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: () => api.post<{ temporaryPassword: string }>(`/admin/clients/${id}/reset-password`, {}),
    onSuccess: (data) => setTempPassword(data.temporaryPassword),
    onError: (e: Error) => alert(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (instanceId: string) => api.delete(`/admin/instances/${instanceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'clients', id] }),
    onError: (e: Error) => alert(e.message),
  })

  function openEdit() {
    setEditForm({ name: tenant?.name ?? '', email: tenant?.email ?? '' })
    setEditError('')
    setShowEditModal(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditError('')
    const body: { name?: string; email?: string } = {}
    if (editForm.name !== tenant?.name) body.name = editForm.name
    if (editForm.email !== tenant?.email) body.email = editForm.email
    editMutation.mutate(body)
  }

  function handleCopyPassword() {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
  if (!tenant) return <p style={{ color: '#EF4444' }}>Cliente não encontrado.</p>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{tenant.name}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{tenant.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-sm" onClick={openEdit}>
            Editar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(119,94,252,0.15)', color: 'var(--accent)', border: '1px solid rgba(119,94,252,0.3)' }}
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? 'Enviando...' : 'Reenviar Convite'}
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            onClick={() => { if (confirm('Resetar a senha deste cliente?')) resetPasswordMutation.mutate() }}
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? 'Resetando...' : 'Resetar Senha'}
          </button>
        </div>
      </div>

      {/* Senha temporária */}
      {tempPassword && (
        <div className="glass-card p-4 mb-6" style={{ border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.06)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#EAB308' }}>Senha temporária gerada</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Compartilhe com o cliente — esta senha não será exibida novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
              {tempPassword}
            </code>
            <button
              onClick={handleCopyPassword}
              className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(119,94,252,0.2)', color: copied ? '#22C55E' : 'var(--accent)' }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={() => setTempPassword(null)}
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-8">
        <div><p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Plano</p><p className="font-semibold">{tenant.planType === 'unlimited' ? 'Ilimitado' : `${tenant.planLimit} instâncias`}</p></div>
        <div><p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Instâncias</p><p className="font-semibold">{tenant.instances.length} / {tenant.planLimit ?? '∞'}</p></div>
        <div><p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Status</p><p className="font-semibold">{tenant.status}</p></div>
      </div>

      <h3 className="font-semibold mb-3">Instâncias</h3>
      {tenant.instances.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--text-subtle)' }}>
          Nenhuma instância criada. Use o Dashboard para criar instâncias.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tenant.instances.map((inst) => (
            <div key={inst.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{inst.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{inst.wppSessionId}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${statusColor[inst.status]}22`, color: statusColor[inst.status] }}>
                  {statusLabel[inst.status] ?? inst.status}
                </span>
                <button onClick={() => { if (confirm('Deletar instância?')) deleteMutation.mutate(inst.id) }} className="text-xs" style={{ color: '#EF4444' }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Editar Cliente</h3>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Nome</label>
                <input
                  className="input-dark"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  className="input-dark"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              {editError && <p className="text-sm" style={{ color: '#EF4444' }}>{editError}</p>}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
