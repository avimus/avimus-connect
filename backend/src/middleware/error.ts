import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error(`[error] ${req.method} ${req.path}:`, err.message)

  if (process.env['NODE_ENV'] === 'production') {
    res.status(500).json({ error: 'Erro interno do servidor' })
  } else {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
}
