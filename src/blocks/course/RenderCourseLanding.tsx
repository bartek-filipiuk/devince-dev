import React from 'react'

import type { Locale } from '@/i18n'
import { CourseRichTextBlock } from './CourseRichText/Component'
import { CourseVideoBlock } from './CourseVideo/Component'
import { CourseImageBlock } from './CourseImage/Component'
import { CourseCalloutBlock } from './CourseCallout/Component'

/**
 * Renders the per-course landing — the ordered list of course-native blocks a
 * course owner composes in the Program "Treść" tab. Returns `null` when there
 * are no blocks so existing courses (no landing) render identically.
 */
export function RenderCourseLanding({
  blocks,
  locale,
}: {
  blocks: any[] | null | undefined
  locale: Locale
}) {
  if (!blocks?.length) return null

  return (
    <section className="block course-landing">
      {blocks.map((b, i) => {
        switch (b.blockType) {
          case 'courseRichText':
            return <CourseRichTextBlock key={i} {...b} locale={locale} />
          case 'courseVideo':
            return <CourseVideoBlock key={i} {...b} locale={locale} />
          case 'courseImage':
            return <CourseImageBlock key={i} {...b} locale={locale} />
          case 'courseCallout':
            return <CourseCalloutBlock key={i} {...b} locale={locale} />
          default:
            return null
        }
      })}
    </section>
  )
}
