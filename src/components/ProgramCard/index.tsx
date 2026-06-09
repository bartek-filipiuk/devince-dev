import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'
import type { Program, Media as MediaType } from '@/payload-types'
import { Calendar, MapPin, Globe } from 'lucide-react'
import { defaultLocale, t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { formatDateTime } from '@/utilities/formatDateTime'

type ProgramCardData = Pick<
  Program,
  'id' | 'title' | 'slug' | 'type' | 'heroImage' | 'heroDescription' | 'startDate' | 'format' | 'pricing'
>

type Props = {
  program: ProgramCardData
  showDescription?: boolean
  locale?: Locale
}

const getTypeBadgeLabel = (type: string, locale: Locale): string => {
  switch (type) {
    case 'course':
      return t(locale, 'program.type.course')
    case 'workshop':
      return t(locale, 'program.type.workshop')
    case 'event':
      return t(locale, 'program.type.event')
    default:
      return type
  }
}

const getFormatLabel = (format: string | null | undefined, locale: Locale): string => {
  switch (format) {
    case 'online':
      return t(locale, 'program.format.online')
    case 'physical':
      return t(locale, 'program.format.physical')
    case 'hybrid':
      return t(locale, 'program.format.hybrid')
    default:
      return ''
  }
}

export const ProgramCard: React.FC<Props> = ({
  program,
  showDescription = true,
  locale = defaultLocale,
}) => {
  const { title, slug, type, heroImage, heroDescription, startDate, format, pricing } = program

  const hasHeroImage = heroImage && typeof heroImage !== 'string'

  return (
    <Link href={getLocalizedPath(`/program/${slug}`, locale)} className="program-card">
      <div className="program-card-image">
        {hasHeroImage ? (
          <Media resource={heroImage as MediaType} fill imgClassName="object-cover" />
        ) : (
          <div className="program-card-no-image">{t(locale, 'program.noImage')}</div>
        )}
        <div className="program-card-badges">
          <span className={`program-card-badge program-card-badge--${type}`}>
            {getTypeBadgeLabel(type, locale)}
          </span>
          {format && (
            <span className="program-card-badge program-card-badge--format">
              {format === 'online' && <Globe className="w-3 h-3" />}
              {format === 'physical' && <MapPin className="w-3 h-3" />}
              {format === 'hybrid' && <Globe className="w-3 h-3" />}
              {getFormatLabel(format, locale)}
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
              {formatDateTime(startDate, locale)}
            </span>
          )}
          {pricing && (
            <span className="program-card-meta-item">
              {pricing === 'free'
                ? t(locale, 'program.pricing.free')
                : t(locale, 'program.pricing.paid')}
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
