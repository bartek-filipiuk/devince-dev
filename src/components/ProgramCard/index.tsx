import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'
import type { Program, Media as MediaType } from '@/payload-types'
import { Calendar, MapPin, Globe } from 'lucide-react'

type ProgramCardData = Pick<
  Program,
  'id' | 'title' | 'slug' | 'type' | 'heroImage' | 'heroDescription' | 'startDate' | 'format' | 'pricing'
>

type Props = {
  program: ProgramCardData
  showDescription?: boolean
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const getTypeBadgeLabel = (type: string): string => {
  switch (type) {
    case 'course':
      return 'Kurs'
    case 'workshop':
      return 'Warsztat'
    case 'event':
      return 'Wydarzenie'
    default:
      return type
  }
}

const getFormatLabel = (format: string | null | undefined): string => {
  switch (format) {
    case 'online':
      return 'Online'
    case 'physical':
      return 'Stacjonarnie'
    case 'hybrid':
      return 'Hybrydowo'
    default:
      return ''
  }
}

export const ProgramCard: React.FC<Props> = ({ program, showDescription = true }) => {
  const { title, slug, type, heroImage, heroDescription, startDate, format, pricing } = program

  const hasHeroImage = heroImage && typeof heroImage !== 'string'

  return (
    <Link href={`/program/${slug}`} className="program-card">
      <div className="program-card-image">
        {hasHeroImage ? (
          <Media resource={heroImage as MediaType} fill imgClassName="object-cover" />
        ) : (
          <div className="program-card-no-image">Brak obrazu</div>
        )}
        <div className="program-card-badges">
          <span className={`program-card-badge program-card-badge--${type}`}>
            {getTypeBadgeLabel(type)}
          </span>
          {format && (
            <span className="program-card-badge program-card-badge--format">
              {format === 'online' && <Globe className="w-3 h-3" />}
              {format === 'physical' && <MapPin className="w-3 h-3" />}
              {format === 'hybrid' && <Globe className="w-3 h-3" />}
              {getFormatLabel(format)}
            </span>
          )}
        </div>
      </div>
      <div className="program-card-content">
        <h3 className="program-card-title">{title}</h3>
        <div className="program-card-meta">
          {startDate && (
            <span className="program-card-meta-item">
              <Calendar className="w-4 h-4" />
              {formatDate(startDate)}
            </span>
          )}
          {pricing && (
            <span className="program-card-meta-item">
              {pricing === 'free' ? 'Bezpłatnie' : 'Płatne'}
            </span>
          )}
        </div>
        {showDescription && heroDescription && (
          <p className="program-card-description">{heroDescription}</p>
        )}
      </div>
    </Link>
  )
}

export default ProgramCard
