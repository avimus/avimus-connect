import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import { validateBody, validateQuery } from '../../middleware/validate'
import * as instanceService from '../../services/instance.service'
import * as logService from '../../services/log.service'
import * as wppService from '../../services/wpp.service'

const router = Router()

router.use(requireAdmin)

const instancesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['online', 'offline', 'waiting_qr', 'error', 'unknown']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

router.get('/instances', validateQuery(instancesQuerySchema), async (req, res, next) => {
  try {
    const result = await instanceService.listAllInstances(req.query as { tenantId?: string; status?: string; page?: number; limit?: number })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

const createInstanceSchema = z.object({
  name: z.string().min(1).max(255),
})

router.post('/clients/:clientId/instances', validateBody(createInstanceSchema), async (req, res, next) => {
  try {
    const { name } = req.body as { name: string }
    const instance = await instanceService.createInstance({ tenantId: req.params['clientId']!, name })
    res.status(201).json(instance)
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number }
    if (e.statusCode === 422) { res.status(422).json({ error: e.message }); return }
    if ((e as { code?: string }).code === 'P2002') { res.status(409).json({ error: 'Session ID já em uso' }); return }
    next(err)
  }
})

router.delete('/instances/:instanceId', async (req, res, next) => {
  try {
    const instance = await instanceService.getInstanceById(req.params['instanceId']!)
    if (!instance) { res.status(404).json({ error: 'Instância não encontrada' }); return }

    await logService.createLog({ instanceId: instance.id, tenantId: instance.tenantId, eventType: 'disconnected', details: { reason: 'deleted_by_admin' } })

    await wppService.closeSession(instance.wppSessionId, instance.wppToken ?? undefined)

    await instanceService.deleteInstance(instance.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

const logsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  instanceId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

router.get('/logs', validateQuery(logsQuerySchema), async (req, res, next) => {
  try {
    const result = await logService.listAllLogs(req.query as { tenantId?: string; instanceId?: string; eventType?: string; from?: Date; to?: Date; page?: number; limit?: number })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
