'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { StatusBadge } from '@/components/client/StatusBadge'
import { QRCodeModal } from '@/components/client/QRCodeModal'

interface Instance { id: string; name: string; status: string; lastPolledAt: string | null }

export default function ClientInstancesPage() {
  const qc = useQueryClient()
  const [qrInstance, setQrInstance] = useState<Instance | null>(null)

  const { data } = usePolling(
    ['client', 'instances'],
    () => api.get<{ data: Instance[] }>('/client/instances'),
    { intervalMs: 30000 }
  )

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Minhas Instâncias</h2>

      {(data?.data ?? []).length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--text-subtle)' }}>
          Nenhuma instância configurada. Contate o suporte.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.data ?? []).map((inst) => (
            <div key={inst.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{inst.name}</h3>
                <StatusBadge status={inst.status} />
              </div>

              <p className="text-xs mb-4" style={{ color: 'var(--text-subtle)' }}>
                Atualizado: {inst.lastPolledAt ? new Date(inst.lastPolledAt).toLocaleTimeString('pt-BR') : '—'}
              </p>

              <div className="flex gap-2">
                {inst.status !== 'online' && (
                  <button className="btn-primary flex-1 text-sm" onClick={() => setQrInstance(inst)}>
                    Reconectar
                  </button>
                )}
                {inst.status === 'waiting_qr' && (
                  <button
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'rgba(119,94,252,0.15)', color: 'var(--accent)', border: '1px solid rgba(119,94,252,0.3)' }}
                    onClick={() => setQrInstance(inst)}
                  >
                    Ver QR Code
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {qrInstance && (
        <QRCodeModal
          instanceId={qrInstance.id}
          instanceName={qrInstance.name}
          onClose={() => setQrInstance(null)}
          onConnected={() => { setQrInstance(null); qc.invalidateQueries({ queryKey: ['client', 'instances'] }) }}
        />
      )}
    </div>
  )
}
