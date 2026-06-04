import { Router } from 'express'
import { z } from 'zod'
import { requireClient } from '../../middleware/auth'
import { validateQuery } from '../../middleware/validate'
import * as instanceService from '../../services/instance.service'
import * as logService from '../../services/log.service'
import * as wppService from '../../services/wpp.service'
import { WppAuthError } from '../../services/wpp.service'
import { env } from '../../config/env'

const router = Router()

router.use(requireClient)

function maskToken(t: string): string {
  return t.length > 10 ? `${t.substring(0, 10)}...` : '***'
}

router.get('/instances', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId!
    const instances = await instanceService.listByTenant(tenantId)
    console.log(`[CLIENT:list] tenantId: ${tenantId} | ${instances.length} instâncias retornadas`)
    res.json({ data: instances })
  } catch (err) {
    next(err)
  }
})

router.post('/instances/:id/reconnect', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId!
    const instance = await instanceService.getInstanceById(req.params['id']!, tenantId)

    if (!instance) { res.status(403).json({ error: 'Não autorizado' }); return }
    if (instance.status === 'online') { res.status(400).json({ error: 'Instância já está online' }); return }

    console.log(`[CLIENT:reconnect] instância: ${instance.id} | session_id: ${instance.wppSessionId} | status atual: ${instance.status}`)

    await logService.createLog({ instanceId: instance.id, tenantId, eventType: 'reconnect_attempt' })

    let token = await instanceService.ensureWppToken(instance.id, instance.wppSessionId, instance.wppToken)
    console.log(`[CLIENT:reconnect] token: ${maskToken(token)}`)

    let qrcode: string | null = null
    try {
      qrcode = await wppService.startSession(instance.wppSessionId, token)
    } catch (err) {
      if (err instanceof WppAuthError) {
        console.warn(`[CLIENT:reconnect] WppAuthError — renovando token para "${instance.wppSessionId}"`)
        token = await instanceService.refreshWppToken(instance.id, instance.wppSessionId)
        qrcode = await wppService.startSession(instance.wppSessionId, token)
      } else throw err
    }

    await instanceService.updateInstanceStatus(instance.id, 'waiting_qr', false)
    console.log(`[CLIENT:reconnect] start-session OK | ${instance.wppSessionId} → waiting_qr | qrcode: ${qrcode ? `presente (${qrcode.length} chars)` : 'ausente'}`)

    res.status(202).json({ instanceId: instance.id, status: 'waiting_qr', qrcode, message: 'Reconexão iniciada. Aguardando QR Code.' })
  } catch (err) {
    next(err)
  }
})

router.get('/instances/:id/wpp-status', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId!
    const instance = await instanceService.getInstanceById(req.params['id']!, tenantId)

    if (!instance) { res.status(403).json({ error: 'Não autorizado' }); return }

    console.log(`[CLIENT:wpp-status] instância: ${instance.id} | session_id: ${instance.wppSessionId}`)

    let token = await instanceService.ensureWppToken(instance.id, instance.wppSessionId, instance.wppToken)

    let status: wppService.NormalizedStatus
    try {
      status = await wppService.getDetailedStatus(instance.wppSessionId, token)
    } catch (err) {
      if (err instanceof WppAuthError) {
        console.warn(`[CLIENT:wpp-status] WppAuthError — renovando token para "${instance.wppSessionId}"`)
        token = await instanceService.refreshWppToken(instance.id, instance.wppSessionId)
        status = await wppService.getDetailedStatus(instance.wppSessionId, token)
      } else throw err
    }

    console.log(`[CLIENT:wpp-status] ${instance.wppSessionId} → ${status}`)
    res.json({ status })
  } catch (err) {
    next(err)
  }
})

router.get('/instances/:id/qrcode', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId!
    const instance = await instanceService.getInstanceById(req.params['id']!, tenantId)

    if (!instance) { res.status(403).json({ error: 'Não autorizado' }); return }

    console.log(`[CLIENT:qrcode] instância: ${instance.id} | session_id: ${instance.wppSessionId}`)

    let token = await instanceService.ensureWppToken(instance.id, instance.wppSessionId, instance.wppToken)

    let result: { status: wppService.NormalizedStatus; qrcode: string | null }
    try {
      result = await wppService.getStatusSession(instance.wppSessionId, token)
    } catch (err) {
      if (err instanceof WppAuthError) {
        console.warn(`[CLIENT:qrcode] WppAuthError — renovando token para "${instance.wppSessionId}"`)
        token = await instanceService.refreshWppToken(instance.id, instance.wppSessionId)
        result = await wppService.getStatusSession(instance.wppSessionId, token)
      } else throw err
    }

    console.log(`[CLIENT:qrcode] status-session: ${result.status} | qrcode: ${result.qrcode ? `presente (${result.qrcode.length} chars)` : 'ausente'}`)

    if (!result.qrcode) {
      res.status(400).json({ error: `QR Code não disponível. Status WPP: ${result.status}` })
      return
    }

    res.json({ qrcode: result.qrcode, expiresIn: 60 })
  } catch (err) {
    next(err)
  }
})

const logsQuerySchema = z.object({
  instanceId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

router.get('/logs', validateQuery(logsQuerySchema), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId!
    const result = await logService.listByTenant(tenantId, req.query as { instanceId?: string; eventType?: string; from?: Date; to?: Date; page?: number; limit?: number })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
