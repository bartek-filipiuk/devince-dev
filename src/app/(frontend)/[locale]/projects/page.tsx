import type { Metadata } from 'next/types'

import { ProjectCard } from '@/components/ProjectCard'
import { ScrollReveal } from '@/components/ScrollReveal'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { getLocaleFromParams } from '@/utilities/getLocale'
import { t } from '@/i18n'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  const payload = await getPayload({ config: configPromise })

  const projects = await payload.find({
    collection: 'projects',
    depth: 1,
    limit: 24,
    locale,
    overrideAccess: false,
    sort: '-publishedAt',
    select: {
      title: true,
      slug: true,
      technologies: true,
      heroImage: true,
      meta: true,
    },
  })

  return (
    <div className="projects-archive pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>{t(locale, 'projects.title')}</h1>
          <p className="text-lg text-muted-foreground">{t(locale, 'projects.description')}</p>
        </div>
      </div>

      <div className="container">
        <div className="projects-grid">
          {projects.docs?.map((project, index) => {
            if (typeof project === 'object' && project !== null) {
              return (
                <ScrollReveal key={project.id} animation="fade-up" delay={index * 100}>
                  <ProjectCard doc={project} showTechnologies />
                </ScrollReveal>
              )
            }
            return null
          })}
        </div>

        {projects.docs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t(locale, 'projects.noProjects')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  return {
    title: t(locale, 'projects.metaTitle'),
    description: t(locale, 'projects.metaDescription'),
  }
}
