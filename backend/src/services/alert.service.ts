import { prisma } from '../config/db'
import { env } from '../config/env'
import { sendAlertEmail } from './email.service'
import { updateAlertSentAt } from './instance.service'

const COOLDOWN_MS = 10 * 60 * 1000

export async function checkAndSendAlert(params: {
  instanceId: string
  instanceName: string
  tenantId: string
  lastKnownStatus: string | null
  newStatus: string
  lastAlertSentAt: Date | null
}): Promise<boolean> {
  const { lastKnownStatus, newStatus, lastAlertSentAt } = params

  if (lastKnownStatus !== 'online' || newStatus !== 'offline') return false

  if (lastAlertSentAt) {
    const elapsed = Date.now() - lastAlertSentAt.getTime()
    if (elapsed < COOLDOWN_MS) return false
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { email: true },
  })
  if (!tenant) return false

  await sendAlertEmail({
    to: tenant.email,
    instanceName: params.instanceName,
    occurredAt: new Date(),
    panelUrl: `${env.APP_URL}/client/instances`,
  })

  await updateAlertSentAt(params.instanceId)
  return true
}
