import './config/env'
import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { errorHandler } from './middleware/error'

const app = express()

app.use(cors({
  origin: env.APP_URL,
  credentials: true,
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes — US1
import authRoutes from './routes/auth.routes'
import adminClientsRoutes from './routes/admin/clients.routes'
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/admin/clients', adminClientsRoutes)

// Routes — US2
import adminInstancesRoutes from './routes/admin/instances.routes'
app.use('/api/v1/admin', adminInstancesRoutes)

// Routes — US3
import clientInstancesRoutes from './routes/client/instances.routes'
app.use('/api/v1/client', clientInstancesRoutes)

// Routes — API Keys (admin)
import apiKeysRoutes from './routes/admin/apikeys.routes'
app.use('/api/v1/admin/api-keys', apiKeysRoutes)

// Routes — External API
import externalRoutes from './routes/external/external.routes'
app.use('/api/external', externalRoutes)

// Swagger UI
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger/spec'
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(errorHandler)

const server = app.listen(env.PORT, () => {
  console.log(`[server] Running on port ${env.PORT} (${env.NODE_ENV})`)
})

// Phase 6 — US4: Polling job
import { startPollingJob } from './jobs/polling.job'
const pollingJob = startPollingJob()

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down gracefully')
  pollingJob.stop()
  server.close(() => process.exit(0))
})

export default app
