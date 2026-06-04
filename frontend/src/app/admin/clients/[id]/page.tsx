'use client'
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

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin', 'clients', id],
    queryFn: () => api.get<Tenant>(`/admin/clients/${id}`),
  })

  const resendMutation = useMutation({
    mutationFn: () => api.post(`/admin/clients/${id}/resend-invite`, {}),
    onSuccess: () => alert('Convite reenviado!'),
    onError: (e: Error) => alert(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (instanceId: string) => api.delete(`/admin/instances/${instanceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'clients', id] }),
    onError: (e: Error) => alert(e.message),
  })

  if (isLoading) return <p style={{ color: 'rgba(240,240,255,0.4)' }}>Carregando...</p>
  if (!tenant) return <p style={{ color: '#EF4444' }}>Cliente não encontrado.</p>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{tenant.name}</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(240,240,255,0.5)' }}>{tenant.email}</p>
        </div>
        {tenant.status === 'pending' && (
          <button className="btn-primary text-sm" onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
            Reenviar Convite
          </button>
        )}
      </div>

      <div className="glass-card p-4 mb-6 flex gap-8">
        <div><p className="text-xs mb-1" style={{ color: 'rgba(240,240,255,0.4)' }}>Plano</p><p className="font-semibold">{tenant.planType === 'unlimited' ? 'Ilimitado' : `${tenant.planLimit} instâncias`}</p></div>
        <div><p className="text-xs mb-1" style={{ color: 'rgba(240,240,255,0.4)' }}>Instâncias</p><p className="font-semibold">{tenant.instances.length} / {tenant.planLimit ?? '∞'}</p></div>
        <div><p className="text-xs mb-1" style={{ color: 'rgba(240,240,255,0.4)' }}>Status</p><p className="font-semibold">{tenant.status}</p></div>
      </div>

      <h3 className="font-semibold mb-3">Instâncias</h3>
      {tenant.instances.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'rgba(240,240,255,0.4)' }}>
          Nenhuma instância criada. Use o Dashboard para criar instâncias.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tenant.instances.map((inst) => (
            <div key={inst.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{inst.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(240,240,255,0.4)' }}>{inst.wppSessionId}</p>
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
    </div>
  )
}
