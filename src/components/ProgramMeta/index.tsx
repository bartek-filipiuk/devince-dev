'use client'

import React from 'react'
import type { Program } from '@/payload-types'
import { Calendar, MapPin, Globe, Clock, ExternalLink } from 'lucide-react'
import { defaultLocale, t, type Locale } from '@/i18n'
import { formatDateTime } from '@/utilities/formatDateTime'

type Props = {
  program: Program
  locale?: Locale
}

const formatDate = (date: string | null | undefined, locale: Locale): string => {
  if (!date) return ''
  return formatDateTime(date, locale)
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

const getFormatIcon = (format: string | null | undefined) => {
  switch (format) {
    case 'online':
      return <Globe className="w-5 h-5" />
    case 'physical':
      return <MapPin className="w-5 h-5" />
    case 'hybrid':
      return (
        <>
          <Globe className="w-5 h-5" />
          <MapPin className="w-5 h-5" />
        </>
      )
    default:
      return null
  }
}

export const ProgramMeta: React.FC<Props> = ({ program, locale = defaultLocale }) => {
  const {
    startDate,
    endDate,
    format,
    locationName,
    locationAddress,
    pricing,
    ctaLabel,
    ctaUrl,
    duration,
    type,
  } = program

  const hasDateRange = startDate && endDate && startDate !== endDate
  const showLocation = (format === 'physical' || format === 'hybrid') && (locationName || locationAddress)

  return (
    <div className="program-meta-bar">
      <div className="program-meta-bar-inner container">
        {/* Date */}
        {startDate && (
          <div className="program-meta-item">
            <Calendar className="program-meta-icon" />
            <div className="program-meta-content">
              <span className="program-meta-label">{t(locale, 'program.label.date')}</span>
              <span className="program-meta-value">
                {hasDateRange
                  ? `${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}`
                  : formatDate(startDate, locale)}
              </span>
            </div>
          </div>
        )}

        {/* Duration (only for courses) */}
        {type === 'course' && duration && (
          <div className="program-meta-item">
            <Clock className="program-meta-icon" />
            <div className="program-meta-content">
              <span className="program-meta-label">{t(locale, 'program.label.duration')}</span>
              <span className="program-meta-value">{duration}</span>
            </div>
          </div>
        )}

        {/* Format */}
        {format && (
          <div className="program-meta-item">
            <div className="program-meta-icon-group">{getFormatIcon(format)}</div>
            <div className="program-meta-content">
              <span className="program-meta-label">{t(locale, 'program.label.format')}</span>
              <span className="program-meta-value">{getFormatLabel(format, locale)}</span>
            </div>
          </div>
        )}

        {/* Location */}
        {showLocation && (
          <div className="program-meta-item">
            <MapPin className="program-meta-icon" />
            <div className="program-meta-content">
              <span className="program-meta-label">{t(locale, 'program.label.location')}</span>
              <span className="program-meta-value">
                {locationName}
                {locationAddress && <span className="program-meta-address">{locationAddress}</span>}
              </span>
            </div>
          </div>
        )}

        {/* Pricing */}
        {pricing && (
          <div className="program-meta-item">
            <div className="program-meta-content">
              <span className="program-meta-label">{t(locale, 'program.label.price')}</span>
              <span className={`program-meta-value program-meta-price--${pricing}`}>
                {pricing === 'free'
                  ? t(locale, 'program.pricing.free')
                  : t(locale, 'program.pricing.paid')}
              </span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {ctaLabel && ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="program-cta-button"
          >
            {ctaLabel}
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}

export default ProgramMeta
