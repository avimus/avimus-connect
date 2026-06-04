import { StatusBadge } from '@/components/client/StatusBadge'

interface Instance {
  id: string
  name: string
  wppSessionId: string
  status: string
  lastPolledAt: string | null
  tenant?: { id: string; name: string }
}

interface InstanceCardProps {
  instance: Instance
  onDelete?: (id: string) => void
}

export function InstanceCard({ instance, onDelete }: InstanceCardProps) {
  const lastSeen = instance.lastPolledAt
    ? new Date(instance.lastPolledAt).toLocaleTimeString('pt-BR')
    : '—'

  return (
    <div className="glass-card glass-card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{instance.name}</p>
          {instance.tenant && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-subtle)' }}>
              {instance.tenant.name}
            </p>
          )}
        </div>
        <StatusBadge status={instance.status} className="ml-2 flex-shrink-0" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          Atualizado: {lastSeen}
        </p>
        {onDelete && (
          <button
            onClick={() => { if (confirm(`Excluir "${instance.name}"?`)) onDelete(instance.id) }}
            className="text-xs transition-colors"
            style={{ color: 'rgba(239,68,68,0.6)' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}
