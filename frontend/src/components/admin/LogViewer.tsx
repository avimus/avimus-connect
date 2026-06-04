'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface LogEntry {
  id: string
  eventType: string
  occurredAt: string
  details: Record<string, unknown> | null
  instance: { id: string; name: string }
  tenant?: { id: string; name: string }
}

interface LogsResponse { data: LogEntry[]; total: number; page: number; limit: number }

interface LogViewerProps {
  adminView?: boolean
  tenantId?: string
}

const eventTypeLabel: Record<string, string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  qr_scanned: 'QR Escaneado',
  error: 'Erro',
  reconnect_attempt: 'Tentativa de Reconexão',
}

const eventTypeColor: Record<string, string> = {
  connected: '#22C55E',
  disconnected: '#EF4444',
  qr_scanned: '#775EFC',
  error: '#F97316',
  reconnect_attempt: '#EAB308',
}

export function LogViewer({ adminView = false, tenantId }: LogViewerProps) {
  const [filterClient, setFilterClient] = useState('')
  const [filterType, setFilterType] = useState('')

  const endpoint = adminView ? '/admin/logs' : '/client/logs'
  const params = new URLSearchParams()
  if (filterClient) params.set('tenantId', filterClient)
  if (filterType) params.set('eventType', filterType)
  if (tenantId) params.set('tenantId', tenantId)

  const { data, isLoading } = useQuery({
    queryKey: ['logs', adminView, filterClient, filterType, tenantId],
    queryFn: () => api.get<LogsResponse>(`${endpoint}?${params}`),
    refetchInterval: 30000,
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        {adminView && (
          <input
            className="input-dark flex-1"
            placeholder="Filtrar por ID do cliente"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
        )}
        <select className="input-dark w-48" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(eventTypeLabel).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(240,240,255,0.4)' }}>Carregando logs...</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(119,94,252,0.15)' }}>
                {['Horário', 'Instância', adminView && 'Cliente', 'Evento'].filter(Boolean).map((h) => (
                  <th key={String(h)} className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(240,240,255,0.5)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'rgba(240,240,255,0.5)' }}>
                    {new Date(log.occurredAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'rgba(240,240,255,0.7)' }}>{log.instance.name}</td>
                  {adminView && <td className="px-4 py-2.5" style={{ color: 'rgba(240,240,255,0.5)' }}>{log.tenant?.name ?? '—'}</td>}
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${eventTypeColor[log.eventType] ?? '#6B7280'}22`, color: eventTypeColor[log.eventType] ?? '#6B7280' }}>
                      {eventTypeLabel[log.eventType] ?? log.eventType}
                    </span>
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={adminView ? 4 : 3} className="px-4 py-8 text-center" style={{ color: 'rgba(240,240,255,0.3)' }}>Nenhum evento registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
