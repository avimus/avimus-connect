import { Prisma } from '@prisma/client'
import { prisma } from '../config/db'

export type EventType = 'connected' | 'disconnected' | 'qr_scanned' | 'error' | 'reconnect_attempt'

export async function createLog(params: {
  instanceId: string
  tenantId: string
  eventType: EventType
  details?: Record<string, unknown>
}) {
  return prisma.eventLog.create({
    data: {
      instanceId: params.instanceId,
      tenantId: params.tenantId,
      eventType: params.eventType,
      details: params.details as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  })
}

export async function listAllLogs(filters: {
  tenantId?: string
  instanceId?: string
  eventType?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (filters.tenantId) where['tenantId'] = filters.tenantId
  if (filters.instanceId) where['instanceId'] = filters.instanceId
  if (filters.eventType) where['eventType'] = filters.eventType
  if (filters.from || filters.to) {
    where['occurredAt'] = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    }
  }

  const [data, total] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        instance: { select: { id: true, name: true } },
      },
    }),
    prisma.eventLog.count({ where }),
  ])

  return { data, total, page, limit }
}

export async function listByTenant(tenantId: string, filters: {
  instanceId?: string
  eventType?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}) {
  return listAllLogs({ tenantId, ...filters })
}
