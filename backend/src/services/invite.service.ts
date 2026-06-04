import crypto from 'crypto'
import { prisma } from '../config/db'

const TOKEN_TTL_HOURS = 72

export async function generateToken(tenantId: string): Promise<string> {
  await prisma.inviteToken.updateMany({
    where: { tenantId, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await prisma.inviteToken.create({ data: { tenantId, token, expiresAt } })
  return token
}

export async function validateToken(token: string) {
  const record = await prisma.inviteToken.findUnique({
    where: { token },
    include: { tenant: true },
  })

  if (!record) return null
  if (record.usedAt) return null
  if (record.expiresAt < new Date()) return null

  return record
}

export async function consumeToken(token: string): Promise<boolean> {
  const result = await prisma.inviteToken.updateMany({
    where: { token, usedAt: null },
    data: { usedAt: new Date() },
  })
  return result.count > 0
}
