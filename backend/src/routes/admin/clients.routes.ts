import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import { validateBody, validateQuery } from '../../middleware/validate'
import * as tenantService from '../../services/tenant.service'
import * as inviteService from '../../services/invite.service'
import * as emailService from '../../services/email.service'

const router = Router()

router.use(requireAdmin)

const listQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const result = await tenantService.listTenants(req.query as { status?: string; page?: number; limit?: number })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  planType: z.enum(['one', 'five', 'unlimited', 'custom']),
  planLimit: z.number().int().positive().optional(),
}).refine((d) => d.planType !== 'custom' || d.planLimit !== undefined, {
  message: 'planLimit é obrigatório para plano custom',
  path: ['planLimit'],
})

router.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const body = req.body as { name: string; email: string; planType: 'one' | 'five' | 'unlimited' | 'custom'; planLimit?: number }

    const emailExists = await tenantService.checkEmailExists(body.email)
    if (emailExists) {
      res.status(409).json({ error: 'Email já cadastrado' })
      return
    }

    const tenant = await tenantService.createTenant(body)
    const token = await inviteService.generateToken(tenant.id)
    await emailService.sendInviteEmail({ to: tenant.email, tenantName: tenant.name, token })

    res.status(201).json(tenant)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params['id']!)
    if (!tenant) {
      res.status(404).json({ error: 'Cliente não encontrado' })
      return
    }
    res.json(tenant)
  } catch (err) {
    next(err)
  }
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  planType: z.enum(['one', 'five', 'unlimited', 'custom']).optional(),
  planLimit: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

router.patch('/:id', validateBody(updateSchema), async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenant(req.params['id']!, req.body as tenantService.UpdateTenantInput)
    res.json(tenant)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/resend-invite', async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params['id']!)
    if (!tenant) {
      res.status(404).json({ error: 'Cliente não encontrado' })
      return
    }
    if (tenant.status === 'active') {
      res.status(400).json({ error: 'Cliente já possui conta ativa' })
      return
    }

    const token = await inviteService.generateToken(tenant.id)
    await emailService.sendInviteEmail({ to: tenant.email, tenantName: tenant.name, token })

    res.json({ message: 'Convite reenviado com sucesso' })
  } catch (err) {
    next(err)
  }
})

export default router
