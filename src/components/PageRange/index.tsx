import React from 'react'

import { defaultLocale, t, type Locale } from '@/i18n'

export const PageRange: React.FC<{
  className?: string
  collection?: 'posts'
  collectionLabels?: {
    plural?: string
    singular?: string
  }
  currentPage?: number
  limit?: number
  locale?: Locale
  totalDocs?: number
}> = (props) => {
  const {
    className,
    collection,
    collectionLabels: collectionLabelsFromProps,
    currentPage,
    limit,
    locale = defaultLocale,
    totalDocs,
  } = props

  let indexStart = (currentPage ? currentPage - 1 : 1) * (limit || 1) + 1
  if (totalDocs && indexStart > totalDocs) indexStart = 0

  let indexEnd = (currentPage || 1) * (limit || 1)
  if (totalDocs && indexEnd > totalDocs) indexEnd = totalDocs

  const defaultLabels = {
    plural: t(locale, 'pageRange.docsPlural'),
    singular: t(locale, 'pageRange.docsSingular'),
  }

  const collectionLabels =
    collection === 'posts'
      ? {
          plural: t(locale, 'pageRange.postsPlural'),
          singular: t(locale, 'pageRange.postsSingular'),
        }
      : undefined

  const labels = collectionLabelsFromProps || collectionLabels || defaultLabels
  const plural = labels.plural || defaultLabels.plural
  const singular = labels.singular || defaultLabels.singular

  const range = `${indexStart}${indexStart > 0 ? ` - ${indexEnd}` : ''}`

  return (
    <div className={[className, 'font-semibold'].filter(Boolean).join(' ')}>
      {(typeof totalDocs === 'undefined' || totalDocs === 0) && t(locale, 'pageRange.noResults')}
      {typeof totalDocs !== 'undefined' &&
        totalDocs > 0 &&
        t(locale, 'pageRange.showing', {
          range,
          total: totalDocs,
          label: totalDocs > 1 ? plural : singular,
        })}
    </div>
  )
}
