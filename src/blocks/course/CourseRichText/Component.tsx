import React from 'react'

import type { CourseRichTextBlock as CourseRichTextProps } from '@/payload-types'
import type { Locale } from '@/i18n'
import RichText from '@/components/RichText'

/**
 * "Tekst" course-landing block. Renders an optional course-themed heading
 * followed by Lexical body content. RichText runs with prose/gutter disabled so
 * the main-site Tailwind `prose` styles don't bleed in — the `.course-prose`
 * wrapper in `course-theme.css` styles the headings/paragraphs/lists/links.
 */
export const CourseRichTextBlock: React.FC<CourseRichTextProps & { locale?: Locale }> = ({
  heading,
  body,
}) => {
  return (
    <div className="course-rt">
      {heading ? <h2 className="ct-h">{heading}</h2> : null}
      {body ? (
        <div className="course-prose">
          <RichText data={body} enableGutter={false} enableProse={false} />
        </div>
      ) : null}
    </div>
  )
}
