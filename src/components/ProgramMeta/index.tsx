'use client'

import React from 'react'
import type { Program } from '@/payload-types'
import { Calendar, MapPin, Globe, Clock, ExternalLink } from 'lucide-react'

type Props = {
  program: Program
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateShort = (date: string | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

export const ProgramMeta: React.FC<Props> = ({ program }) => {
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
              <span className="program-meta-label">Data</span>
              <span className="program-meta-value">
                {hasDateRange
                  ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
                  : formatDate(startDate)}
              </span>
            </div>
          </div>
        )}

        {/* Duration (only for courses) */}
        {type === 'course' && duration && (
          <div className="program-meta-item">
            <Clock className="program-meta-icon" />
            <div className="program-meta-content">
              <span className="program-meta-label">Czas trwania</span>
              <span className="program-meta-value">{duration}</span>
            </div>
          </div>
        )}

        {/* Format */}
        {format && (
          <div className="program-meta-item">
            <div className="program-meta-icon-group">{getFormatIcon(format)}</div>
            <div className="program-meta-content">
              <span className="program-meta-label">Format</span>
              <span className="program-meta-value">{getFormatLabel(format)}</span>
            </div>
          </div>
        )}

        {/* Location */}
        {showLocation && (
          <div className="program-meta-item">
            <MapPin className="program-meta-icon" />
            <div className="program-meta-content">
              <span className="program-meta-label">Lokalizacja</span>
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
              <span className="program-meta-label">Cena</span>
              <span className={`program-meta-value program-meta-price--${pricing}`}>
                {pricing === 'free' ? 'Bezpłatnie' : 'Płatne'}
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
