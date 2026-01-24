import React from 'react'
import { Media } from '@/components/Media'
import type { Program, Media as MediaType } from '@/payload-types'

type Props = {
  program: Program
}

export const ProgramHero: React.FC<Props> = ({ program }) => {
  const { heroImage, heroHeadline, heroDescription, title } = program

  const hasHeroImage = heroImage && typeof heroImage !== 'string'
  const displayHeadline = heroHeadline || title

  return (
    <section className="program-hero">
      <div className="program-hero-image">
        {hasHeroImage ? (
          <Media resource={heroImage as MediaType} fill imgClassName="object-cover" priority />
        ) : (
          <div className="program-hero-placeholder" />
        )}
      </div>
      <div className="program-hero-overlay" />
      <div className="program-hero-content container">
        {displayHeadline && <h1 className="program-hero-headline">{displayHeadline}</h1>}
        {heroDescription && <p className="program-hero-description">{heroDescription}</p>}
      </div>
    </section>
  )
}

export default ProgramHero
