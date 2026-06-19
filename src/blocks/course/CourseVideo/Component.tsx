import React from 'react'

import type { CourseVideoBlock as CourseVideoProps } from '@/payload-types'
import type { Locale } from '@/i18n'
import { toEmbedUrl } from '@/utilities/embedUrl'

/**
 * "Wideo" course-landing block. The URL is normalized through `toEmbedUrl`
 * (https-only, YouTube/Vimeo canonicalized). If it can't be turned into a safe
 * embed src we fall back to a plain link rather than rendering an iframe with an
 * untrusted scheme.
 */
export const CourseVideoBlock: React.FC<CourseVideoProps & { locale?: Locale }> = ({
  url,
  caption,
}) => {
  const src = url ? toEmbedUrl(url) : null

  if (!src) {
    if (!url) return null
    return (
      <p className="course-video__fallback">
        <a href={url} rel="noopener noreferrer" target="_blank">
          {caption || url}
        </a>
      </p>
    )
  }

  return (
    <figure className="course-video">
      <div className="course-video__frame">
        <iframe
          src={src}
          title={caption || 'Wideo'}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {caption ? <figcaption className="course-video__cap">{caption}</figcaption> : null}
    </figure>
  )
}
