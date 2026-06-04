import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../config/jwt'

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação ausente' })
    return
  }

  try {
    const token = header.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Acesso restrito a administradores' })
      return
    }
    next()
  })
}

export function requireClient(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user.role !== 'client') {
      res.status(403).json({ error: 'Acesso restrito a clientes' })
      return
    }
    if (!req.user.tenantId) {
      res.status(403).json({ error: 'Contexto de tenant ausente' })
      return
    }
    next()
  })
}
