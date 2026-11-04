/**
 * Cloudflare Turnstile server-side check for public signup forms.
 *
 * Ships dark: without TURNSTILE_SECRET_KEY every call passes, so the code can be
 * deployed before the widget keys exist. With the key set it fails closed: no
 * token, a bad token, or Cloudflare being unreachable all reject the request.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false
  const form = new URLSearchParams({ secret, response: token })
  if (ip && ip !== 'unknown') form.set('remoteip', ip)
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as { success?: unknown }
    return data.success === true
  } catch {
    return false
  }
}
