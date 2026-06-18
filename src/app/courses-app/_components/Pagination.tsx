import Link from 'next/link'
import { t, defaultLocale, type Locale } from '@/i18n'

/**
 * Server pagination for the courses storefront. Renders prev / „X / Y" / next
 * links to ?page=N using the course theme button classes. Renders nothing when
 * there is a single page (or fewer).
 *
 * Shared with the apps storefront, which omits `locale` (falls back to the
 * default locale). The `?page=N` links are query-only and preserve the current
 * path, so they stay locale-correct without prefixing.
 */
export function Pagination({
  page,
  totalPages,
  locale = defaultLocale,
}: {
  page: number
  totalPages: number
  locale?: Locale
}) {
  if (totalPages <= 1) return null

  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <nav className="pagination" aria-label={t(locale, 'courses.pagination.label')}>
      {hasPrev ? (
        <Link className="btn btn--ghost" href={`?page=${page - 1}`} rel="prev">
          <span className="icon" data-i="back" aria-hidden="true" />
          <span>{t(locale, 'courses.pagination.prev')}</span>
        </Link>
      ) : (
        <span className="btn btn--ghost" aria-disabled="true">
          <span className="icon" data-i="back" aria-hidden="true" />
          <span>{t(locale, 'courses.pagination.prev')}</span>
        </span>
      )}

      <span className="mono pagination__count" aria-current="page">
        {page} / {totalPages}
      </span>

      {hasNext ? (
        <Link className="btn btn--ghost" href={`?page=${page + 1}`} rel="next">
          <span>{t(locale, 'courses.pagination.next')}</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </Link>
      ) : (
        <span className="btn btn--ghost" aria-disabled="true">
          <span>{t(locale, 'courses.pagination.next')}</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </span>
      )}
    </nav>
  )
}
