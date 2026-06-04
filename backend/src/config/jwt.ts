import jwt from 'jsonwebtoken'
import { env } from './env'

export interface JwtPayload {
  sub: string
  email: string
  tenantId: string | null
  role: 'admin' | 'client'
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}
