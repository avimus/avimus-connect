import { randomUUID } from 'crypto'
import { prisma } from '../config/db'
import * as wppService from './wpp.service'

export interface CreateInstanceInput {
  tenantId: string
  name: string
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30)
}

function generateSessionId(tenantName: string): string {
  const slug = slugify(tenantName)
  const shortId = randomUUID().split('-')[0]!  // primeiros 8 chars do uuid
  return `${slug}-${shortId}`
}

function maskToken(t: string): string {
  return t.length > 10 ? `${t.substring(0, 10)}...` : '***'
}

// Campos públicos — wppToken excluído intencionalmente de todos os retornos de API
const publicSelect = {
  id: true,
  tenantId: true,
  name: true,
  wppSessionId: true,
  status: true,
  lastKnownStatus: true,
  lastAlertSentAt: true,
  lastPolledAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function createInstance(input: CreateInstanceInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } })
  if (!tenant) throw new Error('Tenant não encontrado')

  console.log(`[ADMIN:createInstance] tenant: "${tenant.name}" (id: ${input.tenantId})`)

  if (tenant.planLimit !== null) {
    const count = await prisma.instance.count({ where: { tenantId: input.tenantId } })
    if (count >= tenant.planLimit) {
      const err = new Error(`Limite de instâncias do plano atingido (${count} de ${tenant.planLimit})`)
      ;(err as Error & { statusCode: number }).statusCode = 422
      throw err
    }
  }

  const wppSessionId = generateSessionId(tenant.name)
  console.log(`[ADMIN:createInstance] session_id gerado: ${wppSessionId}`)

  let wppToken: string | undefined
  console.log(`[ADMIN:createInstance] chamando generate-token para "${wppSessionId}"`)
  try {
    wppToken = await wppService.generateToken(wppSessionId)
    console.log(`[ADMIN:createInstance] token gerado: ${maskToken(wppToken)}`)
  } catch (err) {
    console.error(`[ADMIN:createInstance] falha ao gerar token para "${wppSessionId}":`, err)
  }

  const instance = await prisma.instance.create({
    data: { tenantId: input.tenantId, name: input.name, wppSessionId, wppToken },
    select: publicSelect,
  })
  console.log(`[ADMIN:createInstance] instância salva no banco: id=${instance.id} | session=${wppSessionId} | nome="${input.name}"`)
  return instance
}

export async function deleteInstance(id: string, tenantId?: string) {
  const where = tenantId ? { id, tenantId } : { id }
  return prisma.instance.delete({ where })
}

export async function listAllInstances(filters: {
  tenantId?: string
  status?: string
  page?: number
  limit?: number
}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (filters.tenantId) where['tenantId'] = filters.tenantId
  if (filters.status) where['status'] = filters.status

  const [data, total] = await Promise.all([
    prisma.instance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { ...publicSelect, tenant: { select: { id: true, name: true } } },
    }),
    prisma.instance.count({ where }),
  ])

  return { data, total, page, limit }
}

export async function listByTenant(tenantId: string) {
  return prisma.instance.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: publicSelect,
  })
}

// Retorna modelo completo incluindo wppToken — uso interno pelas routes
export async function getInstanceById(id: string, tenantId?: string) {
  const where = tenantId ? { id, tenantId } : { id }
  return prisma.instance.findUnique({ where })
}

export async function updateInstanceStatus(id: string, status: string, updateLastKnown = true) {
  const data: Record<string, unknown> = { status, lastPolledAt: new Date() }
  if (updateLastKnown) data['lastKnownStatus'] = status
  return prisma.instance.update({ where: { id }, data })
}

export async function updateAlertSentAt(id: string) {
  return prisma.instance.update({ where: { id }, data: { lastAlertSentAt: new Date() } })
}

// Retorna o token existente ou gera um novo se ausente
export async function ensureWppToken(
  instanceId: string,
  sessionId: string,
  currentToken: string | null
): Promise<string> {
  if (currentToken) return currentToken
  const token = await wppService.generateToken(sessionId)
  await prisma.instance.update({ where: { id: instanceId }, data: { wppToken: token } })
  return token
}

// Força geração de novo token (chamado após WppAuthError)
export async function refreshWppToken(instanceId: string, sessionId: string): Promise<string> {
  const token = await wppService.generateToken(sessionId)
  await prisma.instance.update({ where: { id: instanceId }, data: { wppToken: token } })
  return token
}
