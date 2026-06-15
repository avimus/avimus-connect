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
    include: {
      allowedInstances: {
        select: {
          instanceId: true,
          instance: { select: { id: true, name: true, status: true } },
        },
      },
    },
  })
}

export async function revokeApiKey(id: string) {
  return prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })
}

export async function validateApiKey(key: string) {
  const record = await prisma.apiKey.findUnique({
    where: { key },
    include: {
      allowedInstances: { select: { instanceId: true } },
    },
  })
  if (!record || record.revokedAt) return null
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
  return record
}

export async function getApiKeyInstances(id: string) {
  return prisma.apiKeyInstance.findMany({
    where: { apiKeyId: id },
    select: {
      instance: { select: { id: true, name: true, status: true, wppSessionId: true } },
    },
  })
}

export async function setApiKeyInstances(id: string, instanceIds: string[]) {
  await prisma.$transaction([
    prisma.apiKeyInstance.deleteMany({ where: { apiKeyId: id } }),
    ...(instanceIds.length > 0
      ? [
          prisma.apiKeyInstance.createMany({
            data: instanceIds.map((instanceId) => ({ apiKeyId: id, instanceId })),
          }),
        ]
      : []),
  ])
}
