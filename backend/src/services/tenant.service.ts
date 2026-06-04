import { prisma } from '../config/db'

export interface CreateTenantInput {
  name: string
  email: string
  planType: 'one' | 'five' | 'unlimited' | 'custom'
  planLimit?: number
}

export interface UpdateTenantInput {
  name?: string
  planType?: string
  planLimit?: number
  status?: string
}

function resolvePlanLimit(planType: string, planLimit?: number): number | null {
  if (planType === 'one') return 1
  if (planType === 'five') return 5
  if (planType === 'unlimited') return null
  return planLimit ?? null
}

export async function createTenant(input: CreateTenantInput) {
  const planLimit = resolvePlanLimit(input.planType, input.planLimit)
  return prisma.tenant.create({
    data: {
      name: input.name,
      email: input.email,
      planType: input.planType,
      planLimit,
      status: 'pending',
    },
  })
}

export async function listTenants(filters: { status?: string; page?: number; limit?: number }) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  const where = filters.status ? { status: filters.status } : {}

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { instances: true } } },
    }),
    prisma.tenant.count({ where }),
  ])

  return { data, total, page, limit }
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: { instances: { orderBy: { createdAt: 'desc' } } },
  })
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData['name'] = input.name
  if (input.status !== undefined) updateData['status'] = input.status
  if (input.planType !== undefined) {
    updateData['planType'] = input.planType
    updateData['planLimit'] = resolvePlanLimit(input.planType, input.planLimit)
  }
  return prisma.tenant.update({ where: { id }, data: updateData })
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const count = await prisma.tenant.count({ where: { email } })
  return count > 0
}
