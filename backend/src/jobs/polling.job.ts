import cron from 'node-cron'
import { prisma } from '../config/db'
import * as wppService from '../services/wpp.service'
import { WppAuthError } from '../services/wpp.service'
import { checkAndSendAlert } from '../services/alert.service'
import { createLog } from '../services/log.service'

// Impede sobreposição de ciclos se o anterior ainda está rodando
let isRunning = false

async function runPollingCycle(): Promise<void> {
  if (isRunning) {
    console.warn('[POLLING:cycle] ciclo anterior ainda em execução — pulando')
    return
  }
  isRunning = true

  try {
    const instances = await prisma.instance.findMany({
      where: { status: { not: 'error' } },
      select: {
        id: true,
        tenantId: true,
        name: true,
        wppSessionId: true,
        wppToken: true,
        status: true,
        lastKnownStatus: true,
        lastAlertSentAt: true,
      },
    })

    if (instances.length === 0) return

    console.log(`[POLLING:cycle] início | ${instances.length} instâncias monitoradas`)
    const start = Date.now()

    for (const inst of instances) {
      try {
        // Garante token — gera se ausente
        let token = inst.wppToken
        if (!token) {
          console.log(`[POLLING:instance] ${inst.wppSessionId} | sem token — gerando...`)
          try {
            token = await wppService.generateToken(inst.wppSessionId)
            await prisma.instance.update({ where: { id: inst.id }, data: { wppToken: token } })
            console.log(`[POLLING:instance] ${inst.wppSessionId} | token gerado`)
          } catch {
            console.warn(`[POLLING:instance] ${inst.wppSessionId} | falha ao gerar token — pulando`)
            continue
          }
        }

        let newStatus: wppService.NormalizedStatus
        try {
          newStatus = await wppService.getDetailedStatus(inst.wppSessionId, token)
          if (newStatus === 'online') {
            const confirmed = await wppService.checkConnection(inst.wppSessionId, token)
            if (confirmed !== 'online') newStatus = confirmed
          }
        } catch (err) {
          if (err instanceof WppAuthError) {
            console.warn(`[POLLING:instance] ${inst.wppSessionId} | WppAuthError — regenerando token e retentando`)
            try {
              token = await wppService.generateToken(inst.wppSessionId)
              await prisma.instance.update({ where: { id: inst.id }, data: { wppToken: token } })
              newStatus = await wppService.getDetailedStatus(inst.wppSessionId, token)
              console.log(`[POLLING:instance] ${inst.wppSessionId} | token renovado, status: ${newStatus}`)
            } catch {
              newStatus = 'unknown'
            }
          } else {
            newStatus = 'unknown'
          }
        }

        // Otimização: sem mudança de estado e já unknown → WPP provavelmente fora do ar, não grava
        if (newStatus === 'unknown' && inst.status === 'unknown') {
          console.log(`[POLLING:instance] ${inst.wppSessionId} | já unknown — sem escrita no banco`)
          continue
        }

        const statusChanged = newStatus !== inst.status
        console.log(`[POLLING:instance] ${inst.wppSessionId} | anterior: ${inst.status} | novo: ${newStatus} | ${statusChanged ? 'MUDANÇA DETECTADA' : 'sem mudança'}`)

        await prisma.instance.update({
          where: { id: inst.id },
          data: {
            status: newStatus,
            lastKnownStatus: newStatus !== 'unknown' ? newStatus : inst.lastKnownStatus,
            lastPolledAt: new Date(),
          },
        })

        if (statusChanged) {
          const eventTypeMap: Record<string, string> = {
            online:      'connected',
            offline:     'disconnected',
            waiting_qr:  'reconnect_attempt',
            error:       'error',
          }
          const eventType = eventTypeMap[newStatus] ?? 'error'

          await createLog({
            instanceId: inst.id,
            tenantId: inst.tenantId,
            eventType: eventType as 'connected' | 'disconnected' | 'qr_scanned' | 'error' | 'reconnect_attempt',
          })

          await checkAndSendAlert({
            instanceId: inst.id,
            instanceName: inst.name,
            tenantId: inst.tenantId,
            lastKnownStatus: inst.lastKnownStatus,
            newStatus,
            lastAlertSentAt: inst.lastAlertSentAt,
          })
        }
      } catch (err) {
        console.error(`[POLLING:instance] ${inst.wppSessionId} | erro inesperado:`, err)
      }
    }

    console.log(`[POLLING:cycle] concluído em ${Date.now() - start}ms`)
  } finally {
    isRunning = false
  }
}

export function startPollingJob(): cron.ScheduledTask {
  const task = cron.schedule('*/30 * * * * *', () => {
    runPollingCycle().catch((err) => console.error('[POLLING:cycle] erro no ciclo:', err))
  })

  console.log('[POLLING:cycle] job iniciado — intervalo: 30s')
  return task
}
