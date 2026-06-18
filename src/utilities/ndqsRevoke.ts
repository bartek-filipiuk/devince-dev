export async function revokeNdqsByEmail(args: {
  email: string
  courseId: string
}): Promise<{ ok: boolean; status: number }> {
  // Prefer an explicit revoke URL; otherwise derive it from the enroll URL by
  // swapping the endpoint path. Both NDQS admin endpoints share host + token.
  const url =
    process.env.NDQS_REVOKE_URL ||
    process.env.NDQS_ENROLL_URL?.replace('enroll-by-email', 'revoke-enrollment')
  const token = process.env.NDQS_SERVICE_TOKEN
  if (!url || !token) return { ok: false, status: 0 }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': token },
      body: JSON.stringify({ email: args.email, course_id: args.courseId }),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}
