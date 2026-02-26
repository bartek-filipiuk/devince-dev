import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { createErrorResponse } from './errors.js'

export function validateAuth(request: NextRequest) {
  const token = process.env.EXTERNAL_API_TOKEN
  if (!token) {
    return createErrorResponse('SERVICE_UNAVAILABLE', 'External API not configured')
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return createErrorResponse('AUTH_MISSING', 'Authorization header required')
  }

  const provided = authHeader.slice(7)

  // HMAC both values to normalize length and prevent timing leaks
  const providedHash = crypto.createHmac('sha256', token).update(provided).digest()
  const expectedHash = crypto.createHmac('sha256', token).update(token).digest()

  if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
    return createErrorResponse('AUTH_INVALID', 'Invalid token')
  }

  return null
}
