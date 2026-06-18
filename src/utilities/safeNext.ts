/**
 * Open-redirect guard: only allow a same-origin RELATIVE path.
 * Accept values that start with a single "/" and are NOT "//..." (protocol-
 * relative) and do NOT contain a scheme (e.g. "/\\evil.com", "javascript:").
 * Anything else (absolute URLs, protocol-relative, backslash tricks) -> fallback.
 */
export function safeNext(next: string | null, fallback: string): string {
  if (!next) return fallback
  // Must begin with exactly one slash (relative, same-origin path).
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  // Reject backslashes (browsers treat "/\" like "//" -> protocol-relative).
  if (next.includes('\\')) return fallback
  // Reject whitespace and any C0 control characters that could smuggle a scheme.
  if (/\s/.test(next)) return fallback
  for (let i = 0; i < next.length; i++) {
    if (next.charCodeAt(i) < 0x20) return fallback
  }
  // Reject a leading scheme even after the slash (defense in depth).
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return fallback
  return next
}
