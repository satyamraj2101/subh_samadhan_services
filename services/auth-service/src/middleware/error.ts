import { NextFunction, Request, Response } from 'express'
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  const code = err.status ?? 500
  res.status(code).json({ error: { message: err.message ?? 'Server error', code: err.code ?? 'SERVER_ERROR' } })
}
