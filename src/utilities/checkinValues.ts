// Serwerowa walidacja dynamicznych pól check-inu/pomiaru wg configu programu.
// Konwencja repo: unknown + ręczne zawężanie, bez zod. Granica zaufania: input
// przychodzi od klienta LUB z argumentów narzędzia MCP — zawsze przez te funkcje.

export type FieldDef = {
  key: string
  fieldType: 'boolean' | 'number' | 'select' | 'text'
  min?: number | null
  max?: number | null
  options?: { value: string }[] | null
}

export type MetricDef = { key: string; min?: number | null; max?: number | null }

type Result<T> = { ok: true; values: T } | { ok: false; error: string }

export function validateCheckinValues(
  fields: FieldDef[],
  input: unknown,
): Result<Record<string, unknown>> {
  if (input == null) return { ok: true, values: {} }
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'values musi być obiektem' }
  const defs = new Map(fields.map((f) => [f.key, f]))
  const values: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = defs.get(key)
    if (!def) return { ok: false, error: `Nieznane pole: ${key}` }
    if (raw == null) {
      values[key] = null
      continue
    }
    switch (def.fieldType) {
      case 'boolean':
        if (typeof raw !== 'boolean') return { ok: false, error: `${key}: oczekiwano tak/nie` }
        break
      case 'number':
        if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, error: `${key}: oczekiwano liczby` }
        if (def.min != null && raw < def.min) return { ok: false, error: `${key}: minimum ${def.min}` }
        if (def.max != null && raw > def.max) return { ok: false, error: `${key}: maksimum ${def.max}` }
        break
      case 'select':
        if (typeof raw !== 'string' || !(def.options ?? []).some((o) => o.value === raw))
          return { ok: false, error: `${key}: niedozwolona wartość` }
        break
      case 'text':
        if (typeof raw !== 'string' || raw.length > 2000) return { ok: false, error: `${key}: tekst do 2000 znaków` }
        break
    }
    values[key] = raw
  }
  return { ok: true, values }
}

export function validateMeasurementValues(
  metrics: MetricDef[],
  input: unknown,
): Result<Record<string, number>> {
  if (typeof input !== 'object' || input == null || Array.isArray(input))
    return { ok: false, error: 'values musi być obiektem' }
  const defs = new Map(metrics.map((m) => [m.key, m]))
  const values: Record<string, number> = {}
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = defs.get(key)
    if (!def) return { ok: false, error: `Nieznana metryka: ${key}` }
    if (raw == null) continue
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, error: `${key}: oczekiwano liczby` }
    if (def.min != null && raw < def.min) return { ok: false, error: `${key}: minimum ${def.min}` }
    if (def.max != null && raw > def.max) return { ok: false, error: `${key}: maksimum ${def.max}` }
    values[key] = raw
  }
  return { ok: true, values }
}
