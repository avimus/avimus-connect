import { Router } from 'express'
import { prisma } from '../../config/db'
import { requireApiKey } from '../../middleware/apikey.auth'
import * as instanceService from '../../services/instance.service'
import * as logService from '../../services/log.service'
import * as wppService from '../../services/wpp.service'
import { WppAuthError } from '../../services/wpp.service'

const router = Router()
router.use(requireApiKey)

const instanceSelect = {
  id: true,
  name: true,
  status: true,
  wppSessionId: true,
  wppToken: true,
  tenant: { select: { id: true, name: true, email: true } },
} as const

function mapInstance(i: { tenant: object; [k: string]: unknown }) {
  const { tenant, ...rest } = i
  return { ...rest, client: tenant }
}

// helper: returns Prisma `id` filter when the key is restricted to specific instances
function instanceIdFilter(allowedIds: string[]) {
  return allowedIds.length > 0 ? { id: { in: allowedIds } } : {}
}

router.get('/instances', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    const rows = await prisma.instance.findMany({
      where: instanceIdFilter(allowed),
      orderBy: { createdAt: 'desc' },
      select: instanceSelect,
    })
    res.json({ data: rows.map(mapInstance) })
  } catch (err) {
    next(err)
  }
})

router.get('/instances/:id', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    if (allowed.length > 0 && !allowed.includes(req.params['id']!)) {
      res.status(404).json({ error: 'Instância não encontrada' })
      return
    }
    const row = await prisma.instance.findUnique({ where: { id: req.params['id']! }, select: instanceSelect })
    if (!row) { res.status(404).json({ error: 'Instância não encontrada' }); return }
    res.json(mapInstance(row))
  } catch (err) {
    next(err)
  }
})

router.get('/clients', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      where: allowed.length > 0
        ? { instances: { some: { id: { in: allowed } } } }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        instances: {
          where: instanceIdFilter(allowed),
          select: { status: true },
        },
      },
    })
    const data = tenants.map(({ instances, ...t }) => ({
      ...t,
      totalInstances: instances.length,
      onlineInstances: instances.filter(i => i.status === 'online').length,
    }))
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

router.get('/clients/:id/instances', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params['id']! } })
    if (!tenant) { res.status(404).json({ error: 'Cliente não encontrado' }); return }
    const rows = await prisma.instance.findMany({
      where: {
        tenantId: req.params['id']!,
        ...instanceIdFilter(allowed),
      },
      orderBy: { createdAt: 'desc' },
      select: instanceSelect,
    })
    res.json({ data: rows.map(mapInstance) })
  } catch (err) {
    next(err)
  }
})

router.post('/instances/:id/reconnect', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    if (allowed.length > 0 && !allowed.includes(req.params['id']!)) {
      res.status(404).json({ error: 'Instance not found' })
      return
    }

    const instance = await instanceService.getInstanceById(req.params['id']!)
    if (!instance) { res.status(404).json({ error: 'Instance not found' }); return }

    if (instance.status === 'online') { res.status(400).json({ error: 'Instância já está online' }); return }

    await logService.createLog({ instanceId: instance.id, tenantId: instance.tenantId, eventType: 'reconnect_attempt' })

    let token = await instanceService.ensureWppToken(instance.id, instance.wppSessionId, instance.wppToken)

    let qrcode: string | null = null
    try {
      qrcode = await wppService.startSession(instance.wppSessionId, token)
    } catch (err) {
      if (err instanceof WppAuthError) {
        token = await instanceService.refreshWppToken(instance.id, instance.wppSessionId)
        qrcode = await wppService.startSession(instance.wppSessionId, token)
      } else throw err
    }

    await instanceService.updateInstanceStatus(instance.id, 'waiting_qr', false)

    res.status(202).json({ instanceId: instance.id, status: 'waiting_qr', qrcode, message: 'Reconexão iniciada. Aguardando QR Code.' })
  } catch (err) {
    next(err)
  }
})

router.get('/metrics', async (req, res, next) => {
  try {
    const allowed = req.allowedInstanceIds!
    const filter = instanceIdFilter(allowed)
    const [totalClients, totalInstances, onlineInstances, offlineInstances] = await Promise.all([
      allowed.length > 0
        ? prisma.tenant.count({ where: { instances: { some: { id: { in: allowed } } } } })
        : prisma.tenant.count(),
      prisma.instance.count({ where: filter }),
      prisma.instance.count({ where: { ...filter, status: 'online' } }),
      prisma.instance.count({ where: { ...filter, status: 'offline' } }),
    ])
    res.json({ totalClients, totalInstances, onlineInstances, offlineInstances })
  } catch (err) {
    next(err)
  }
})

export default router
