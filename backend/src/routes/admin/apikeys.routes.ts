import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as apikeyService from '../../services/apikey.service'
import { prisma } from '../../config/db'

const router = Router()
router.use(requireAdmin)

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(['read', 'full']).default('read'),
})

router.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const { name, scope } = req.body as { name: string; scope: 'read' | 'full' }
    const apiKey = await apikeyService.createApiKey(name, scope, req.user.sub)
    res.status(201).json(apiKey)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const keys = await apikeyService.listApiKeys()
    res.json({ data: keys })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await apikeyService.revokeApiKey(req.params['id']!)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/:id/instances', async (req, res, next) => {
  try {
    const instances = await apikeyService.getApiKeyInstances(req.params['id']!)
    res.json({ data: instances.map((r) => r.instance) })
  } catch (err) {
    next(err)
  }
})

const setInstancesSchema = z.object({
  instanceIds: z.array(z.string().uuid()),
})

router.put('/:id/instances', validateBody(setInstancesSchema), async (req, res, next) => {
  try {
    const { instanceIds } = req.body as { instanceIds: string[] }

    const key = await prisma.apiKey.findUnique({ where: { id: req.params['id']! } })
    if (!key || key.revokedAt) {
      res.status(404).json({ error: 'API Key não encontrada' })
      return
    }

    await apikeyService.setApiKeyInstances(req.params['id']!, instanceIds)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
