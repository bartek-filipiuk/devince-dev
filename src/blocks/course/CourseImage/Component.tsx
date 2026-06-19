import React from 'react'

import type { CourseImageBlock as CourseImageProps } from '@/payload-types'
import type { Locale } from '@/i18n'
import { Media } from '@/components/Media'

/**
 * "Obraz" course-landing block. Renders the uploaded image via the repo `Media`
 * component (Next/Image) inside a course-themed figure. `image` must be a
 * populated object (the course-page program query runs at `depth: 1`); a bare
 * id renders nothing rather than a broken image.
 */
export const CourseImageBlock: React.FC<CourseImageProps & { locale?: Locale }> = ({
  image,
  caption,
}) => {
  if (!image || typeof image !== 'object') return null

  return (
    <figure className="course-figure">
      <Media resource={image} htmlElement={null} imgClassName="course-figure__img" />
      {caption ? <figcaption className="course-figure__cap">{caption}</figcaption> : null}
    </figure>
  )
}
