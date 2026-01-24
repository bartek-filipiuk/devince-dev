import type { Metadata } from 'next/types'
import type { Program } from '@/payload-types'

import { ProgramCard } from '@/components/ProgramCard'
import { ScrollReveal } from '@/components/ScrollReveal'
import configPromise from '@payload-config'
import { getPayload, PaginatedDocs } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { getLocale } from '@/utilities/getLocale'

export const dynamic = 'force-dynamic'
export const revalidate = 600

export default async function Page() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })

  let programs: PaginatedDocs<Program> | null = null

  try {
    programs = await payload.find({
      collection: 'program',
      depth: 1,
      limit: 24,
      locale,
      overrideAccess: false,
      sort: '-startDate',
      where: {
        type: {
          equals: 'workshop',
        },
      },
    })
  } catch {
    // Collection may not exist yet
  }

  return (
    <div className="program-archive pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Warsztaty</h1>
          <p className="text-lg text-muted-foreground">
            Praktyczne warsztaty dla rozwoju Twoich umiejętności.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="program-grid">
          {programs?.docs?.map((program, index) => {
            if (typeof program === 'object' && program !== null) {
              return (
                <ScrollReveal key={program.id} animation="fade-up" delay={index * 100}>
                  <ProgramCard program={program} />
                </ScrollReveal>
              )
            }
            return null
          })}
        </div>

        {(!programs || programs.docs.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Brak dostępnych warsztatów.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Warsztaty',
    description: 'Praktyczne warsztaty dla rozwoju Twoich umiejętności.',
  }
}
