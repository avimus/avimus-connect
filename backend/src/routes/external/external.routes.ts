import { Router } from 'express'
import { prisma } from '../../config/db'
import { requireApiKey } from '../../middleware/apikey.auth'

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

router.get('/instances', async (_req, res, next) => {
  try {
    const rows = await prisma.instance.findMany({ orderBy: { createdAt: 'desc' }, select: instanceSelect })
    res.json({ data: rows.map(mapInstance) })
  } catch (err) {
    next(err)
  }
})

router.get('/instances/:id', async (req, res, next) => {
  try {
    const row = await prisma.instance.findUnique({ where: { id: req.params['id']! }, select: instanceSelect })
    if (!row) { res.status(404).json({ error: 'Instância não encontrada' }); return }
    res.json(mapInstance(row))
  } catch (err) {
    next(err)
  }
})

router.get('/clients', async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, instances: { select: { status: true } } },
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
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params['id']! } })
    if (!tenant) { res.status(404).json({ error: 'Cliente não encontrado' }); return }
    const rows = await prisma.instance.findMany({
      where: { tenantId: req.params['id']! },
      orderBy: { createdAt: 'desc' },
      select: instanceSelect,
    })
    res.json({ data: rows.map(mapInstance) })
  } catch (err) {
    next(err)
  }
})

router.get('/metrics', async (_req, res, next) => {
  try {
    const [totalClients, totalInstances, onlineInstances, offlineInstances] = await Promise.all([
      prisma.tenant.count(),
      prisma.instance.count(),
      prisma.instance.count({ where: { status: 'online' } }),
      prisma.instance.count({ where: { status: 'offline' } }),
    ])
    res.json({ totalClients, totalInstances, onlineInstances, offlineInstances })
  } catch (err) {
    next(err)
  }
})

export default router
