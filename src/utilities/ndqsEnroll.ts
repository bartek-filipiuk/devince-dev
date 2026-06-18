export async function enrollNdqsByEmail(args: {
  email: string
  courseId: string
}): Promise<{ ok: boolean; status: number }> {
  const url = process.env.NDQS_ENROLL_URL
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
