'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React from 'react'

import type { Project, Media as MediaType } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardProjectData = Pick<Project, 'slug' | 'technologies' | 'meta' | 'title' | 'heroImage'>

export const ProjectCard: React.FC<{
  className?: string
  doc?: CardProjectData
  showTechnologies?: boolean
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, showTechnologies = true } = props

  const { slug, technologies, meta, title, heroImage } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasTechnologies = technologies && Array.isArray(technologies) && technologies.length > 0
  const sanitizedDescription = description?.replace(/\s/g, ' ')
  const href = `/projects/${slug}`

  // Use heroImage if metaImage is not available
  const imageToShow = metaImage || heroImage

  return (
    <article
      className={cn('project-card', className)}
      ref={card.ref}
    >
      <div className="project-card-image">
        {!imageToShow && <div className="project-card-no-image">No image</div>}
        {imageToShow && typeof imageToShow !== 'string' && (
          <Media resource={imageToShow as MediaType} size="33vw" />
        )}
      </div>
      <div className="project-card-content">
        {showTechnologies && hasTechnologies && (
          <div className="project-card-tech">
            {technologies.map((tech, index) => (
              <span key={index} className="project-tech-tag">
                {tech.name}
              </span>
            ))}
          </div>
        )}
        {title && (
          <h3 className="project-card-title">
            <Link href={href} ref={link.ref}>
              {title}
            </Link>
          </h3>
        )}
        {description && (
          <p className="project-card-description">{sanitizedDescription}</p>
        )}
      </div>
    </article>
  )
}
