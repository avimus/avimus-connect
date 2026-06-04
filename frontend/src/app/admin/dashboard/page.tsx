'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { InstanceCard } from '@/components/admin/InstanceCard'

interface Instance { id: string; name: string; wppSessionId: string; status: string; lastPolledAt: string | null; tenant: { id: string; name: string } }
interface InstancesResponse { data: Instance[]; total: number }
interface Client { id: string; name: string; email: string }
interface ClientsResponse { data: Client[]; total: number }
interface CreateForm { clientId: string; name: string }

export default function AdminDashboardPage() {
  const qc = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<CreateForm>({ clientId: '', name: '' })
  const [createError, setCreateError] = useState('')

  const { data, isError } = usePolling(
    ['admin', 'instances'],
    () => api.get<InstancesResponse>('/admin/instances?limit=100'),
    { intervalMs: 30000 }
  )

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['admin', 'clients-select'],
    queryFn: () => api.get<ClientsResponse>('/admin/clients?limit=100'),
    enabled: showCreateModal,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/instances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'instances'] }),
  })

  const createMutation = useMutation({
    mutationFn: (f: CreateForm) => api.post(`/admin/clients/${f.clientId}/instances`, { name: f.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'instances'] })
      setShowCreateModal(false)
      setForm({ clientId: '', name: '' })
      setCreateError('')
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    createMutation.mutate(form)
  }

  function handleClose() {
    setShowCreateModal(false)
    setForm({ clientId: '', name: '' })
    setCreateError('')
  }

  const grouped = (data?.data ?? []).reduce<Record<string, Instance[]>>((acc, inst) => {
    const key = inst.tenant.name
    if (!acc[key]) acc[key] = []
    acc[key].push(inst)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Dashboard Global de Instâncias</h2>
        <div className="flex items-center gap-3">
          {isError && <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>⚠ WPPConnect indisponível</span>}
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Nova Instância</button>
        </div>
      </div>

      {Object.entries(grouped).map(([tenantName, instances]) => (
        <div key={tenantName} className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>{tenantName}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {instances.map((inst) => (
              <InstanceCard key={inst.id} instance={inst} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>
        </div>
      ))}

      {(data?.data ?? []).length === 0 && (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--text-subtle)' }}>
          Nenhuma instância cadastrada.
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nova Instância</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cliente</label>
                <select className="input-dark" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required disabled={clientsLoading}>
                  <option value="">{clientsLoading ? 'Carregando clientes...' : 'Selecione o cliente...'}</option>
                  {(clientsData?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Nome da instância</label>
                <input className="input-dark" placeholder="Ex: Suporte WhatsApp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              {createError && <p className="text-sm" style={{ color: '#EF4444' }}>{createError}</p>}
              <div className="flex gap-2 mt-2">
                <button type="button" className="flex-1 px-4 py-2.5 rounded-lg text-sm" style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }} onClick={handleClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || clientsLoading}>
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
