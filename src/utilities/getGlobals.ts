import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { defaultLocale, type Locale } from '@/i18n'

type Global = keyof Config['globals']

async function getGlobal(slug: Global, locale: Locale, depth = 0) {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    locale,
  })

  return global
}

/**
 * Returns an unstable_cache function mapped with the cache tag for the slug.
 * The locale is part of BOTH the cache key and the tags so each locale is
 * cached separately — otherwise PL and EN share one entry and both render in
 * whichever language was fetched first.
 */
export const getCachedGlobal = (slug: Global, locale: Locale = defaultLocale, depth = 0) =>
  unstable_cache(async () => getGlobal(slug, locale, depth), [slug, locale], {
    tags: [`global_${slug}`, `global_${slug}_${locale}`],
  })
