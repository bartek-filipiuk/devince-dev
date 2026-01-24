import React from 'react'

import type { GlassHeroBlock as GlassHeroProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { ScrollReveal } from '@/components/ScrollReveal'

/**
 * GlassHero Block - Minimal Structure
 *
 * This component provides STRUCTURE only.
 * All visual styling should be added via theme.css based on PAGE_DESIGN.md
 *
 * CSS classes to customize in theme.css:
 * - .hero-section: Main section wrapper
 * - .hero-background: Background layer
 * - .hero-content: Content container
 * - .hero-headline: Main heading
 * - .hero-subheadline: Supporting text
 * - .hero-cta-primary: Primary button
 * - .hero-cta-secondary: Secondary button
 */
export const GlassHeroBlock: React.FC<GlassHeroProps> = ({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  backgroundMedia,
}) => {
  return (
    <section className="hero-section relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background layer - style via .hero-background in theme.css */}
      <div className="hero-background absolute inset-0 bg-background" />

      {/* Background media if provided */}
      {backgroundMedia && typeof backgroundMedia === 'object' && (
        <div className="absolute inset-0">
          <Media
            resource={backgroundMedia}
            fill
            className="object-cover"
            priority
          />
          {/* Overlay for text readability - customize in theme.css */}
          <div className="hero-overlay absolute inset-0" />
        </div>
      )}

      {/* Content container */}
      <div className="container relative z-10">
        <ScrollReveal>
          <div className="hero-content max-w-4xl mx-auto text-center p-8 md:p-12 lg:p-16">
            {headline && (
              <h1 className="hero-headline text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                {headline}
              </h1>
            )}

            {subheadline && (
              <div className="hero-subheadline text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-80">
                <RichText data={subheadline} enableGutter={false} />
              </div>
            )}

            {(primaryCTA?.label || secondaryCTA?.label) && (
              <div className="hero-cta-container flex flex-col sm:flex-row gap-4 justify-center">
                {primaryCTA && primaryCTA.label && (
                  <CMSLink
                    {...primaryCTA}
                    size="lg"
                    className="hero-cta-primary px-8 py-4 rounded-lg font-semibold"
                  />
                )}
                {secondaryCTA && secondaryCTA.label && (
                  <CMSLink
                    {...secondaryCTA}
                    size="lg"
                    className="hero-cta-secondary px-8 py-4 rounded-lg font-semibold"
                  />
                )}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
