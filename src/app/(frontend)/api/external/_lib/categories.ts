import type { Payload } from 'payload'

/**
 * Resolves an array of category identifiers (IDs or names) to numeric IDs.
 * Creates new categories on-the-fly if a name doesn't match an existing one.
 */
export async function resolveCategories(
  payload: Payload,
  categories: (number | string)[],
): Promise<number[]> {
  const ids: number[] = []

  for (const cat of categories) {
    if (typeof cat === 'number') {
      ids.push(cat)
      continue
    }

    // Try to find by title
    const existing = await payload.find({
      collection: 'categories',
      where: { title: { equals: cat } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      ids.push(existing.docs[0].id)
    } else {
      // Create new category
      const created = await payload.create({
        collection: 'categories',
        data: { title: cat } as never,
      })
      ids.push(created.id)
    }
  }

  return ids
}
