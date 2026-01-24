import React from 'react'
import { ExternalLink, Github } from 'lucide-react'

import type { Project } from '@/payload-types'

import { Media } from '@/components/Media'

export const ProjectHero: React.FC<{
  project: Project
}> = ({ project }) => {
  const { heroImage, title, technologies, githubUrl, productionUrl } = project

  const hasTechnologies = technologies && technologies.length > 0

  return (
    <div className="project-hero">
      <div className="project-hero-image">
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill priority imgClassName="object-cover" resource={heroImage} />
        )}
        <div className="project-hero-overlay" />
      </div>
      <div className="project-hero-content container">
        <h1 className="project-title">{title}</h1>

        {hasTechnologies && (
          <div className="project-technologies">
            {technologies.map((tech, index) => (
              <span key={index} className="project-tech-tag">
                {tech.name}
              </span>
            ))}
          </div>
        )}

        {(githubUrl || productionUrl) && (
          <div className="project-links">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link-button"
              >
                <Github size={20} />
                GitHub
              </a>
            )}
            {productionUrl && (
              <a
                href={productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link-button project-link-button--primary"
              >
                <ExternalLink size={20} />
                Live Site
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
