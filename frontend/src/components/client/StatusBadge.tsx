import { statusColors } from '@/styles/tokens'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusLabels: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  waiting_qr: 'Aguardando QR',
  error: 'Erro',
  unknown: 'Desconhecido',
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const color = statusColors[status] ?? statusColors['unknown']

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: `${color}22`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {statusLabels[status] ?? status}
    </span>
  )
}
