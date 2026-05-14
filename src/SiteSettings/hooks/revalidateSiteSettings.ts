import type { GlobalAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'
import { revalidatePaths } from '@/utilities/revalidate'

export const revalidateSiteSettings: GlobalAfterChangeHook = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating site-settings`)

    revalidateTag('global_site-settings')
    // Site Settings affects Footer (on every page) + /contact directly.
    // Listing pages are included because the Footer is rendered there too.
    revalidatePaths(
      '/',
      '/contact',
      '/posts',
      '/projects',
      '/courses',
      '/workshops',
      '/events',
    )
  }

  return doc
}
