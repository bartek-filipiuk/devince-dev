import React from 'react'

import type { FeaturesBlock as FeaturesProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { ScrollReveal } from '@/components/ScrollReveal'

/**
 * Icon Map - Basic SVG icons
 * Can be extended or replaced in theme-specific implementations
 */
const iconMap: Record<string, React.ReactNode> = {
  calendar: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  book: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  users: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  star: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  code: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  globe: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  heart: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  lightning: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
}

/**
 * Features Block - Minimal Structure
 *
 * This component provides STRUCTURE only.
 * All visual styling should be added via theme.css based on PAGE_DESIGN.md
 *
 * CSS classes to customize in theme.css:
 * - .features-section: Main section wrapper
 * - .features-header: Title and description container
 * - .features-title: Section heading
 * - .features-description: Section description
 * - .features-grid: Grid container
 * - .feature-card: Individual feature card
 * - .feature-icon: Icon container
 * - .feature-title: Feature heading
 * - .feature-description: Feature description
 * - .feature-link: Feature link
 */
export const FeaturesBlock: React.FC<FeaturesProps> = ({
  sectionTitle,
  sectionDescription,
  features,
}) => {
  return (
    <section className="features-section py-20 relative">
      <div className="container">
        {(sectionTitle || sectionDescription) && (
          <ScrollReveal>
            <div className="features-header text-center mb-16">
              {sectionTitle && (
                <h2 className="features-title text-3xl md:text-4xl font-bold mb-4">
                  {sectionTitle}
                </h2>
              )}
              {sectionDescription && (
                <p className="features-description text-lg text-muted-foreground max-w-2xl mx-auto">
                  {sectionDescription}
                </p>
              )}
            </div>
          </ScrollReveal>
        )}

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features?.map((feature, index) => (
            <ScrollReveal key={index} staggerIndex={(index % 6) + 1}>
              <div className="feature-card p-6 rounded-lg border bg-card h-full">
                {feature.icon && iconMap[feature.icon] && (
                  <div className="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-primary text-primary-foreground">
                    {iconMap[feature.icon]}
                  </div>
                )}
                <h3 className="feature-title text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="feature-description text-muted-foreground mb-4">
                  {feature.description}
                </p>
                {feature.linkUrl && feature.linkLabel && (
                  <CMSLink
                    type="custom"
                    url={feature.linkUrl}
                    label={feature.linkLabel}
                    appearance="inline"
                    className="feature-link text-primary font-medium inline-flex items-center gap-1"
                  >
                    {feature.linkLabel}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CMSLink>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
