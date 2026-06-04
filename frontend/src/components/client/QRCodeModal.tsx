'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/services/api'

interface QRCodeModalProps {
  instanceId: string
  instanceName: string
  onClose: () => void
  onConnected?: () => void
}

type Phase = 'reconnecting' | 'waiting_status' | 'fetching_qr' | 'ready' | 'error'

const STATUS_TIMEOUT_S   = 60
const STATUS_INTERVAL_MS = 3000
const STATUS_MAX_POLLS   = STATUS_TIMEOUT_S / (STATUS_INTERVAL_MS / 1000)
const QR_MAX_ATTEMPTS    = 20
const QR_INTERVAL_MS     = 3000

const PHASE_LABEL: Record<Phase, string> = {
  reconnecting:   'Fase 1 — Iniciando sessão...',
  waiting_status: 'Fase 2 — Aguardando sessão iniciar...',
  fetching_qr:    'Fase 3 — Carregando QR Code...',
  ready:  '',
  error:  '',
}

const PHASE_ORDER: Phase[] = ['reconnecting', 'waiting_status', 'fetching_qr']

export function QRCodeModal({ instanceId, instanceName, onClose, onConnected }: QRCodeModalProps) {
  const [phase, setPhase]                 = useState<Phase>('reconnecting')
  const [qrcode, setQrcode]               = useState<string | null>(null)
  const [qrCountdown, setQrCountdown]     = useState(60)
  const [statusElapsed, setStatusElapsed] = useState(0)
  const [qrAttempt, setQrAttempt]         = useState(0)
  const [error, setError]                 = useState('')

  const isMounted     = useRef(true)
  const generationRef = useRef(0)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const runFlow = useCallback(async () => {
    if (!isMounted.current) return
    const gen   = ++generationRef.current
    const alive = () => isMounted.current && generationRef.current === gen

    setPhase('reconnecting')
    setQrcode(null)
    setError('')
    setStatusElapsed(0)
    setQrAttempt(0)

    let reconnectQr: string | null = null
    try {
      const resp = await api.post<{ instanceId: string; status: string; qrcode?: string | null }>(
        `/client/instances/${instanceId}/reconnect`, {}
      )
      reconnectQr = resp.qrcode ?? null
    } catch (e: unknown) {
      if (!alive()) return
      setError(e instanceof Error ? e.message : 'Erro ao iniciar reconexão. Tente novamente.')
      setPhase('error')
      return
    }
    if (!alive()) return

    if (reconnectQr) {
      setQrcode(reconnectQr)
      setQrCountdown(60)
      setPhase('ready')
      return
    }

    setPhase('waiting_status')
    let statusReady = false

    for (let poll = 1; poll <= STATUS_MAX_POLLS; poll++) {
      await new Promise<void>((r) => setTimeout(r, STATUS_INTERVAL_MS))
      if (!alive()) return
      setStatusElapsed(poll * (STATUS_INTERVAL_MS / 1000))
      try {
        const result = await api.get<{ status: string }>(`/client/instances/${instanceId}/wpp-status`)
        if (result.status === 'waiting_qr') { statusReady = true; break }
      } catch { /* continua o polling */ }
      if (!alive()) return
    }

    if (!statusReady) {
      if (!alive()) return
      setError('Sessão não iniciou. Tente novamente.')
      setPhase('error')
      return
    }
    if (!alive()) return

    setPhase('fetching_qr')

    for (let attempt = 1; attempt <= QR_MAX_ATTEMPTS; attempt++) {
      if (!alive()) return
      setQrAttempt(attempt)
      try {
        const data = await api.get<{ qrcode: string; expiresIn: number }>(
          `/client/instances/${instanceId}/qrcode`
        )
        if (data.qrcode) {
          if (!alive()) return
          setQrcode(data.qrcode)
          setQrCountdown(data.expiresIn)
          setPhase('ready')
          return
        }
      } catch { /* continua tentando */ }
      if (attempt < QR_MAX_ATTEMPTS) {
        await new Promise<void>((r) => setTimeout(r, QR_INTERVAL_MS))
      }
    }

    if (!alive()) return
    setError('QR Code indisponível. Clique em Tentar novamente.')
    setPhase('error')
  }, [instanceId])

  useEffect(() => { runFlow() }, [runFlow])

  useEffect(() => {
    if (phase !== 'ready') return
    if (qrCountdown <= 0) { runFlow(); return }
    const t = setTimeout(() => setQrCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [qrCountdown, phase, runFlow])

  useEffect(() => {
    if (phase !== 'ready') return
    const interval = setInterval(async () => {
      try {
        const result = await api.get<{ status: string }>(`/client/instances/${instanceId}/wpp-status`)
        if (result.status === 'online') {
          clearInterval(interval)
          onConnected?.()
        }
      } catch { /* ignora falhas transitórias */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [phase, instanceId, onConnected])

  const statusRemaining = STATUS_TIMEOUT_S - statusElapsed
  const phaseIndex      = PHASE_ORDER.indexOf(phase)
  const isLoading       = phaseIndex !== -1

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="glass-card p-6 w-full max-w-sm text-center">
        <h3 className="font-bold text-lg mb-1">Escanear QR Code</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{instanceName}</p>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 mb-5">
            {PHASE_ORDER.map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < phaseIndex  ? 'rgba(119,94,252,0.45)' :
                      i === phaseIndex ? '#775EFC' :
                      'rgba(119,94,252,0.12)',
                    transform: i === phaseIndex ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
                {i < PHASE_ORDER.length - 1 && (
                  <div className="w-8 h-px" style={{ background: 'var(--border-color)' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div
            className="w-48 h-48 mx-auto flex flex-col items-center justify-center gap-2 mb-4"
            style={{ background: 'var(--glass-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}
          >
            <p className="text-sm px-3 leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {PHASE_LABEL[phase]}
            </p>
            {phase === 'waiting_status' && (
              <p className="text-lg font-mono font-semibold" style={{ color: statusRemaining <= 10 ? '#EF4444' : 'var(--accent)' }}>
                {statusRemaining}s
              </p>
            )}
            {phase === 'fetching_qr' && (
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                tentativa {qrAttempt}/{QR_MAX_ATTEMPTS}
              </p>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="mb-4">
            <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-sm leading-snug" style={{ color: '#EF4444' }}>{error}</p>
            </div>
            <button className="btn-primary w-full" onClick={runFlow}>Tentar novamente</button>
          </div>
        )}

        {phase === 'ready' && qrcode && (
          <>
            <img
              src={qrcode}
              alt="QR Code WhatsApp"
              className="mx-auto rounded-lg mb-3"
              style={{ width: 192, height: 192, background: 'white', padding: 8 }}
            />
            <p className="text-xs mb-4" style={{ color: qrCountdown < 10 ? '#EF4444' : 'var(--text-subtle)' }}>
              {qrCountdown > 0 ? `Expira em ${qrCountdown}s` : 'Atualizando...'}
            </p>
          </>
        )}

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: 'var(--cancel-bg)', color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            Fechar
          </button>
          {onConnected && (
            <button className="btn-primary flex-1" onClick={onConnected}>Já escaneei</button>
          )}
        </div>
      </div>
    </div>
  )
}
