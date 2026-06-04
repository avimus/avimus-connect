import { Request, Response, NextFunction } from 'express'
import * as apikeyService from '../services/apikey.service'

type ApiKeyRecord = NonNullable<Awaited<ReturnType<typeof apikeyService.validateApiKey>>>

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyRecord
    }
  }
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key = req.headers['x-api-key']
  if (!key || typeof key !== 'string') {
    res.status(401).json({ error: 'X-API-Key header obrigatório' })
    return
  }
  const record = await apikeyService.validateApiKey(key)
  if (!record) {
    res.status(401).json({ error: 'API Key inválida ou revogada' })
    return
  }
  req.apiKey = record
  next()
}
