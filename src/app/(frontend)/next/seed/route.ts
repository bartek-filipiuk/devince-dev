import config from '@payload-config'
import { getPayload } from 'payload'
import { seed as seedData } from '@/endpoints/seed'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await getPayload({ config })

  // Create a minimal PayloadRequest-like object
  const req = {
    payload,
    user: null,
    headers: request.headers,
    context: {},
  } as any

  try {
    await seedData({ payload, req })
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request)
}
