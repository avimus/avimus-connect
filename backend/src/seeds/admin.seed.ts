import '../config/env'
import bcrypt from 'bcrypt'
import { prisma } from '../config/db'
import { env } from '../config/env'

async function seed(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL } })
  if (existing) {
    console.log(`[seed] Admin already exists: ${env.ADMIN_EMAIL}`)
    return
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12)
  await prisma.user.create({
    data: {
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      tenantId: null,
    },
  })

  console.log(`[seed] Admin created: ${env.ADMIN_EMAIL}`)
}

seed()
  .catch((e) => {
    console.error('[seed] Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
