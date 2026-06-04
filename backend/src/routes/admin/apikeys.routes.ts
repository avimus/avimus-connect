import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as apikeyService from '../../services/apikey.service'

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

export default router
