import { NextResponse } from 'next/server'

export type ErrorCode =
  | 'AUTH_MISSING'
  | 'AUTH_INVALID'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

export const ERROR_STATUS: Record<ErrorCode, number> = {
  AUTH_MISSING: 401,
  AUTH_INVALID: 401,
  SERVICE_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: { code, message, ...(details && { details }) } },
    { status: ERROR_STATUS[code] },
  )
}

export function createSuccessResponse(data: Record<string, unknown> | object, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function handleRouteError(context: string, error: unknown) {
  console.error(`${context}:`, error)
  return createErrorResponse('INTERNAL_ERROR', `Failed to ${context.toLowerCase()}`)
}
