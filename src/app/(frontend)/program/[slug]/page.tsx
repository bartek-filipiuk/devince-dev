import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { ProgramHero } from '@/components/ProgramHero'
import { ProgramMeta } from '@/components/ProgramMeta'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { generateMeta } from '@/utilities/generateMeta'
import { getLocale } from '@/utilities/getLocale'
import type { Locale } from '@/i18n'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function ProgramPage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const locale = await getLocale()
  const decodedSlug = decodeURIComponent(slug)
  const url = '/program/' + decodedSlug
  const program = await queryProgramBySlug({ slug: decodedSlug, locale })

  if (!program) return <PayloadRedirects url={url} />

  const { layout } = program

  return (
    <article className="program-page">
      <PageClient />

      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <ProgramHero program={program} />

      <ProgramMeta program={program} />

      {layout && layout.length > 0 && (
        <div className="program-content">
          <RenderBlocks blocks={layout} />
        </div>
      )}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const locale = await getLocale()
  const decodedSlug = decodeURIComponent(slug)
  const program = await queryProgramBySlug({ slug: decodedSlug, locale })

  return generateMeta({ doc: program })
}

const queryProgramBySlug = cache(async ({ slug, locale }: { slug: string; locale: Locale }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'program',
    draft,
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
