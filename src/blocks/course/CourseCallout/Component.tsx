import React from 'react'

import type { CourseCalloutBlock as CourseCalloutProps } from '@/payload-types'
import type { Locale } from '@/i18n'

/**
 * "Wyróżnienie / CTA" course-landing block. A highlighted box (styled like
 * `.infocard`) with an optional eyebrow, a heading, optional body copy and an
 * optional primary CTA button. The CTA only renders when both label and url are
 * present.
 */
export const CourseCalloutBlock: React.FC<CourseCalloutProps & { locale?: Locale }> = ({
  eyebrow,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}) => {
  return (
    <div className="course-callout">
      {eyebrow ? (
        <span className="eyebrow">
          <i>{eyebrow}</i>
        </span>
      ) : null}
      <h3>{heading}</h3>
      {body ? <p>{body}</p> : null}
      {ctaLabel && ctaUrl ? (
        <a className="btn btn--primary" href={ctaUrl}>
          {ctaLabel}
        </a>
      ) : null}
    </div>
  )
}
