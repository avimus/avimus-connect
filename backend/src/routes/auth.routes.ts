import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../config/db'
import { signToken } from '../config/jwt'
import { validateBody } from '../middleware/validate'
import { validateToken, consumeToken } from '../services/invite.service'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role as 'admin' | 'client',
    })

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } })
  } catch (err) {
    next(err)
  }
})

router.get('/activate', async (req, res, next) => {
  try {
    const { token } = req.query as { token?: string }
    if (!token) {
      res.status(400).json({ error: 'Token ausente' })
      return
    }

    const record = await validateToken(token)
    if (!record) {
      res.status(400).json({ error: 'Token inválido ou expirado' })
      return
    }

    res.json({ valid: true, tenantName: record.tenant.name, email: record.tenant.email })
  } catch (err) {
    next(err)
  }
})

const activateSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  passwordConfirm: z.string(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: 'Senhas não coincidem',
  path: ['passwordConfirm'],
})

router.post('/activate', validateBody(activateSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body as { token: string; password: string }

    const record = await validateToken(token)
    if (!record) {
      res.status(400).json({ error: 'Token inválido ou expirado' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      await tx.inviteToken.update({ where: { token }, data: { usedAt: new Date() } })

      const existing = await tx.user.findUnique({ where: { email: record.tenant.email } })
      if (existing) {
        await tx.user.update({ where: { id: existing.id }, data: { passwordHash } })
      } else {
        await tx.user.create({
          data: {
            email: record.tenant.email,
            passwordHash,
            role: 'client',
            tenantId: record.tenantId,
          },
        })
      }

      await tx.tenant.update({ where: { id: record.tenantId }, data: { status: 'active' } })
    })

    const user = await prisma.user.findUnique({ where: { email: record.tenant.email } })
    const jwtToken = signToken({
      sub: user!.id,
      email: user!.email,
      tenantId: user!.tenantId,
      role: 'client',
    })

    res.json({ token: jwtToken, user: { id: user!.id, email: user!.email, role: 'client', tenantId: user!.tenantId } })
  } catch (err) {
    next(err)
  }
})

export default router
