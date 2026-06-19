'use client'
import { useEffect, useState } from 'react'
import type { LessonHeading } from '@/utilities/lessonHeadings'

export function TableOfContents({ headings, label }: {
  headings: LessonHeading[]
  label: string
}) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!headings.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [headings])

  if (!headings.length) return null
  return (
    <aside className="lesson-toc" aria-label={label}>
      <div className="lesson-toc__h">{label}</div>
      <nav>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`lesson-toc__i lvl-${h.level}${active === h.id ? ' active' : ''}`}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
