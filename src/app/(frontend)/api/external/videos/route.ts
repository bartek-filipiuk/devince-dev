import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { handleRouteError } from '../_lib/errors.js'
import { getPayloadClient } from '../_lib/payload.js'
import { readList } from '../_lib/read.js'

/** GET /api/external/videos — list exported films (newest export first). */
export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    return readList(await getPayloadClient(), 'videos', request)
  } catch (error) {
    return handleRouteError('List videos', error)
  }
}
