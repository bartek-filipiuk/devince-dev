import type { Payload } from 'payload'

/**
 * Resolves an array of category identifiers (IDs or names) to numeric IDs.
 * Validates that numeric IDs exist. Creates new categories on-the-fly for names.
 */
export async function resolveCategories(
  payload: Payload,
  categories: (number | string)[],
): Promise<number[]> {
  const ids: number[] = []

  for (const cat of categories) {
    if (typeof cat === 'number') {
      const existing = await payload.find({
        collection: 'categories',
        where: { id: { equals: cat } },
        limit: 1,
        depth: 0,
      })
      if (existing.docs.length === 0) {
        throw new Error(`Category with ID ${cat} does not exist`)
      }
      ids.push(cat)
      continue
    }

    const existing = await payload.find({
      collection: 'categories',
      where: { title: { equals: cat } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      ids.push(existing.docs[0].id)
    } else {
      const created = await payload.create({
        collection: 'categories',
        data: { title: cat } as never,
      })
      ids.push(created.id)
    }
  }

  return ids
}
