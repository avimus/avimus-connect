import { randomBytes } from 'crypto'
import { prisma } from '../config/db'

export async function createApiKey(name: string, scope: string, adminId: string) {
  const key = randomBytes(32).toString('hex')
  return prisma.apiKey.create({ data: { name, key, scope, createdBy: adminId } })
}

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    where: { revokedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function revokeApiKey(id: string) {
  return prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })
}

export async function validateApiKey(key: string) {
  const record = await prisma.apiKey.findUnique({ where: { key } })
  if (!record || record.revokedAt) return null
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
  return record
}
