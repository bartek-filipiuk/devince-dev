import Link from 'next/link'

/**
 * Server pagination for the courses storefront. Renders prev / „X / Y" / next
 * links to ?page=N using the course theme button classes. Renders nothing when
 * there is a single page (or fewer).
 */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <nav className="pagination" aria-label="Paginacja kursów">
      {hasPrev ? (
        <Link className="btn btn--ghost" href={`?page=${page - 1}`} rel="prev">
          <span className="icon" data-i="back" aria-hidden="true" />
          <span>Poprzednia</span>
        </Link>
      ) : (
        <span className="btn btn--ghost" aria-disabled="true">
          <span className="icon" data-i="back" aria-hidden="true" />
          <span>Poprzednia</span>
        </span>
      )}

      <span className="mono pagination__count" aria-current="page">
        {page} / {totalPages}
      </span>

      {hasNext ? (
        <Link className="btn btn--ghost" href={`?page=${page + 1}`} rel="next">
          <span>Następna</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </Link>
      ) : (
        <span className="btn btn--ghost" aria-disabled="true">
          <span>Następna</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </span>
      )}
    </nav>
  )
}
