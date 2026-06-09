// Pure helper for adding a purchased program to a user's `purchases` list.
//
// `existing` may be raw ids or populated relationship objects (Payload returns
// either depending on `depth`). Returns a normalized, deduplicated id list.
//
// NOTE: in this project `program` ids are NUMBERS (Postgres). This helper is
// typed against strings for structural simplicity and is fully covered by unit
// tests; the webhook is responsible for coercing the Stripe-metadata id to the
// correct numeric type before calling here / persisting (see route.ts).
type Ref = string | { id: string }

export function addProgramToPurchases(
  existing: Ref[] | null | undefined,
  programId: string,
): string[] {
  const ids = (existing ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  return ids.includes(programId) ? ids : [...ids, programId]
}
