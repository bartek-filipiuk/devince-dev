import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Program } from '../../../payload-types'

export const revalidateProgram: CollectionAfterChangeHook<Program> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/program/${doc.slug}`

      payload.logger.info(`Revalidating program at path: ${path}`)

      revalidatePath(path)
      revalidateTag('program-sitemap')

      // Also revalidate the archive pages based on program type
      if (doc.type === 'course') {
        revalidatePath('/courses')
      } else if (doc.type === 'workshop') {
        revalidatePath('/workshops')
      } else if (doc.type === 'event') {
        revalidatePath('/events')
      }
    }

    // If the program was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/program/${previousDoc.slug}`

      payload.logger.info(`Revalidating old program at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidateTag('program-sitemap')

      // Also revalidate the archive pages
      if (previousDoc.type === 'course') {
        revalidatePath('/courses')
      } else if (previousDoc.type === 'workshop') {
        revalidatePath('/workshops')
      } else if (previousDoc.type === 'event') {
        revalidatePath('/events')
      }
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Program> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/program/${doc?.slug}`

    revalidatePath(path)
    revalidateTag('program-sitemap')

    // Also revalidate the archive pages
    if (doc?.type === 'course') {
      revalidatePath('/courses')
    } else if (doc?.type === 'workshop') {
      revalidatePath('/workshops')
    } else if (doc?.type === 'event') {
      revalidatePath('/events')
    }
  }

  return doc
}
