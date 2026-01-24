import React from 'react'

import type { TestimonialsBlock as TestimonialsProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { ScrollReveal } from '@/components/ScrollReveal'

/**
 * Testimonials Block - Minimal Structure
 *
 * This component provides STRUCTURE only.
 * All visual styling should be added via theme.css based on PAGE_DESIGN.md
 *
 * CSS classes to customize in theme.css:
 * - .testimonials-section: Main section wrapper
 * - .testimonials-header: Title and description container
 * - .testimonials-title: Section heading
 * - .testimonials-grid: Grid container
 * - .testimonial-card: Individual testimonial card
 * - .testimonial-rating: Star rating container
 * - .testimonial-star: Individual star (filled/empty via .filled class)
 * - .testimonial-quote: Quote text
 * - .testimonial-author: Author container
 * - .testimonial-avatar: Avatar image/placeholder
 * - .testimonial-name: Author name
 * - .testimonial-role: Author role/company
 */

const renderStars = (rating: number = 5) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <svg
      key={i}
      className={`testimonial-star w-5 h-5 ${i < rating ? 'filled text-primary' : 'text-muted'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ))
}

export const TestimonialsBlock: React.FC<TestimonialsProps> = ({
  sectionTitle,
  sectionDescription,
  testimonials,
}) => {
  return (
    <section className="testimonials-section py-20 relative">
      <div className="container">
        {(sectionTitle || sectionDescription) && (
          <ScrollReveal>
            <div className="testimonials-header text-center mb-16">
              {sectionTitle && (
                <h2 className="testimonials-title text-3xl md:text-4xl font-bold mb-4">
                  {sectionTitle}
                </h2>
              )}
              {sectionDescription && (
                <p className="testimonials-description text-lg text-muted-foreground max-w-2xl mx-auto">
                  {sectionDescription}
                </p>
              )}
            </div>
          </ScrollReveal>
        )}

        <div className="testimonials-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials?.map((testimonial, index) => (
            <ScrollReveal key={index} staggerIndex={(index % 6) + 1}>
              <div className="testimonial-card p-6 rounded-lg border bg-card h-full">
                {/* Rating */}
                {testimonial.rating && (
                  <div className="testimonial-rating flex gap-1 mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                )}

                {/* Quote */}
                <p className="testimonial-quote text-foreground/90 mb-6 italic leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="testimonial-author flex items-center gap-3">
                  {testimonial.avatar && typeof testimonial.avatar === 'object' ? (
                    <div className="testimonial-avatar relative w-12 h-12 rounded-full overflow-hidden">
                      <Media
                        resource={testimonial.avatar}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="testimonial-avatar w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {testimonial.author?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="testimonial-name font-semibold">{testimonial.author}</p>
                    {testimonial.role && (
                      <p className="testimonial-role text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
