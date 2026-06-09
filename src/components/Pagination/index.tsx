'use client'
import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/utilities/ui'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useLocale } from '@/providers/Locale'
import { getLocalizedPath } from '@/utilities/getLocale'

export const Pagination: React.FC<{
  className?: string
  page: number
  totalPages: number
}> = (props) => {
  const router = useRouter()
  const { locale, t } = useLocale()

  const { className, page, totalPages } = props
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const hasExtraPrevPages = page - 1 > 1
  const hasExtraNextPages = page + 1 < totalPages

  const pageHref = (n: number) => getLocalizedPath(`/posts/page/${n}`, locale)

  return (
    <div className={cn('my-12', className)}>
      <PaginationComponent ariaLabel={t('pagination.label')}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              ariaLabel={t('pagination.goToPrevious')}
              label={t('pagination.previous')}
              disabled={!hasPrevPage}
              onClick={() => {
                router.push(pageHref(page - 1))
              }}
            />
          </PaginationItem>

          {hasExtraPrevPages && (
            <PaginationItem>
              <PaginationEllipsis label={t('pagination.morePages')} />
            </PaginationItem>
          )}

          {hasPrevPage && (
            <PaginationItem>
              <PaginationLink
                onClick={() => {
                  router.push(pageHref(page - 1))
                }}
              >
                {page - 1}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationLink
              isActive
              onClick={() => {
                router.push(pageHref(page))
              }}
            >
              {page}
            </PaginationLink>
          </PaginationItem>

          {hasNextPage && (
            <PaginationItem>
              <PaginationLink
                onClick={() => {
                  router.push(pageHref(page + 1))
                }}
              >
                {page + 1}
              </PaginationLink>
            </PaginationItem>
          )}

          {hasExtraNextPages && (
            <PaginationItem>
              <PaginationEllipsis label={t('pagination.morePages')} />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              ariaLabel={t('pagination.goToNext')}
              label={t('pagination.next')}
              disabled={!hasNextPage}
              onClick={() => {
                router.push(pageHref(page + 1))
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationComponent>
    </div>
  )
}
