/** URL-safe slug. Folds Polish ł/Ł explicitly (NFKD leaves them intact). */
export function slugify(text: string): string {
  return text
    .toString()
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** slugify + a `-N` suffix on repeats, tracked in the caller's `seen` map. */
export function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = slugify(text)
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n > 0 ? `${base}-${n}` : base
}
