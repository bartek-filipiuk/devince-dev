import { NextRequest } from 'next/server'
import { validateAuth } from './_lib/auth.js'
import { createSuccessResponse, handleRouteError } from './_lib/errors.js'
import { buildManifest } from './_lib/manifest.js'

/**
 * GET /api/external — self-describing manifest of the whole external API. Lets an
 * agent learn the surface (resources, methods, fields, enums, conventions) without
 * out-of-repo docs. Bearer EXTERNAL_API_TOKEN like every other endpoint.
 */
export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    return createSuccessResponse(buildManifest(), 200)
  } catch (error) {
    return handleRouteError('Build manifest', error)
  }
}
