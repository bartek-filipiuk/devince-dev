import { revalidatePath } from 'next/cache'

/**
 * Trigger Next.js revalidation for the given path(s).
 * Used by Payload `afterChange` / `afterDelete` hooks so that
 * edits in the admin panel show up on the site without waiting
 * for the route's `revalidate` window to expire.
 */
export function revalidatePaths(...paths: string[]) {
  for (const p of paths) {
    try {
      revalidatePath(p, 'page')
    } catch (e) {
      console.warn(`[revalidate] failed for ${p}:`, e)
    }
  }
}
