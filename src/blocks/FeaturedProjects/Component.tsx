import React from 'react'
import Link from 'next/link'

import type { FeaturedProjectsBlock as FeaturedProjectsProps } from '@/payload-types'

import { ProjectCard } from '@/components/ProjectCard'
import { ScrollReveal } from '@/components/ScrollReveal'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getLocale } from '@/utilities/getLocale'

/**
 * FeaturedProjects Block - Server Component
 *
 * Fetches and displays a limited number of projects with a CTA button.
 * This component provides STRUCTURE only.
 * All visual styling should be added via theme.css based on PAGE_DESIGN.md
 *
 * CSS classes to customize in theme.css:
 * - .featured-projects-section: Main section wrapper
 * - .featured-projects-header: Title and description container
 * - .featured-projects-title: Section heading
 * - .featured-projects-description: Section description
 * - .featured-projects-grid: Grid container
 * - .featured-projects-cta: CTA button wrapper
 * - .featured-projects-button: CTA button
 */
export const FeaturedProjectsBlock: React.FC<FeaturedProjectsProps> = async ({
  sectionTitle,
  sectionDescription,
  limit = 3,
  ctaLabel,
  ctaUrl,
}) => {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })

  const projects = await payload.find({
    collection: 'projects',
    depth: 1,
    limit: limit ?? 3,
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

  if (projects.docs.length === 0) {
    return null
  }

  return (
    <section className="featured-projects-section py-20 relative">
      <div className="container">
        {(sectionTitle || sectionDescription) && (
          <ScrollReveal>
            <div className="featured-projects-header text-center mb-16">
              {sectionTitle && (
                <h2 className="featured-projects-title text-3xl md:text-4xl font-bold mb-4">
                  {sectionTitle}
                </h2>
              )}
              {sectionDescription && (
                <p className="featured-projects-description text-lg text-muted-foreground max-w-2xl mx-auto">
                  {sectionDescription}
                </p>
              )}
            </div>
          </ScrollReveal>
        )}

        <div className="featured-projects-grid projects-grid">
          {projects.docs.map((project, index) => {
            if (typeof project === 'object' && project !== null) {
              return (
                <ScrollReveal key={project.id} staggerIndex={(index % 6) + 1}>
                  <ProjectCard doc={project} showTechnologies />
                </ScrollReveal>
              )
            }
            return null
          })}
        </div>

        {ctaLabel && ctaUrl && (
          <ScrollReveal>
            <div className="featured-projects-cta text-center mt-12">
              <Link
                href={ctaUrl}
                className="featured-projects-button inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                {ctaLabel}
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}
