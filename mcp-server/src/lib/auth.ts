import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

export function createAuthMiddleware(token: string): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'AUTH_MISSING', message: 'Authorization header required' } })
      return
    }

    const provided = authHeader.slice(7)

    // HMAC both values to normalize length and prevent timing leaks
    const providedHash = crypto.createHmac('sha256', token).update(provided).digest()
    const expectedHash = crypto.createHmac('sha256', token).update(token).digest()

    if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
      res.status(401).json({ error: { code: 'AUTH_INVALID', message: 'Invalid token' } })
      return
    }

    next()
  }
}
