'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

interface Tenant {
  id: string
  name: string
  email: string
  planType: string
  planLimit: number | null
  status: string
  _count?: { instances: number }
  createdAt: string
}

interface CreateTenantBody {
  name: string
  email: string
  planType: string
  planLimit?: number
}

const statusLabel: Record<string, string> = { active: 'Ativo', inactive: 'Inativo', pending: 'Aguardando ativação' }
const statusColor: Record<string, string> = { active: '#22C55E', inactive: '#EF4444', pending: '#EAB308' }

export default function AdminClientsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', planType: 'five', planLimit: '' })
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: () => api.get<{ data: Tenant[]; total: number }>('/admin/clients'),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateTenantBody) => api.post<Tenant>('/admin/clients', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'clients'] }); setShowModal(false); setForm({ name: '', email: '', planType: 'five', planLimit: '' }) },
    onError: (e: Error) => setFormError(e.message),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/clients/${id}/resend-invite`, {}),
    onSuccess: () => alert('Convite reenviado com sucesso!'),
    onError: (e: Error) => alert(e.message),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const body: CreateTenantBody = { name: form.name, email: form.email, planType: form.planType }
    if (form.planType === 'custom') body.planLimit = parseInt(form.planLimit)
    createMutation.mutate(body)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Clientes</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Novo Cliente</button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
                  {['Nome', 'Email', 'Plano', 'Instâncias', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.map((t) => (
                  <tr key={t.id} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(119,94,252,0.06)' }}>
                    <td className="px-4 py-3 font-medium">
                      <a href={`/admin/clients/${t.id}`} style={{ color: 'var(--accent)' }}>{t.name}</a>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {t.planType === 'unlimited' ? 'Ilimitado' : t.planLimit ? `${t.planLimit} inst.` : t.planType}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t._count?.instances ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${statusColor[t.status]}22`, color: statusColor[t.status] }}>
                        {statusLabel[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'pending' && (
                        <button onClick={() => resendMutation.mutate(t.id)} className="text-xs" style={{ color: 'var(--accent)' }}>
                          Reenviar convite
                        </button>
                      )}
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
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Novo Cliente</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input className="input-dark" placeholder="Nome da empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input type="email" className="input-dark" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <select className="input-dark" value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value })}>
                <option value="one">1 instância</option>
                <option value="five">5 instâncias</option>
                <option value="unlimited">Ilimitado</option>
                <option value="custom">Customizado</option>
              </select>
              {form.planType === 'custom' && (
                <input type="number" className="input-dark" placeholder="Número de instâncias" value={form.planLimit} onChange={(e) => setForm({ ...form, planLimit: e.target.value })} required min={1} />
              )}
              {formError && <p className="text-sm" style={{ color: '#EF4444' }}>{formError}</p>}
              <div className="flex gap-2 mt-2">
                <button type="button" className="flex-1 px-4 py-2.5 rounded-lg text-sm" style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar e Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
