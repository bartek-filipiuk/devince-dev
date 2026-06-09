import type { ButtonProps } from '@/components/ui/button'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import * as React from 'react'

const Pagination = ({
  className,
  ariaLabel = 'pagination',
  ...props
}: React.ComponentProps<'nav'> & { ariaLabel?: string }) => (
  <nav
    aria-label={ariaLabel}
    className={cn('mx-auto flex w-full justify-center', className)}
    role="navigation"
    {...props}
  />
)

const PaginationContent: React.FC<
  { ref?: React.Ref<HTMLUListElement> } & React.HTMLAttributes<HTMLUListElement>
> = ({ className, ref, ...props }) => (
  <ul className={cn('flex flex-row items-center gap-1', className)} ref={ref} {...props} />
)

const PaginationItem: React.FC<
  { ref?: React.Ref<HTMLLIElement> } & React.HTMLAttributes<HTMLLIElement>
> = ({ className, ref, ...props }) => <li className={cn('', className)} ref={ref} {...props} />

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'button'>

const PaginationLink = ({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) => (
  <button
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        size,
        variant: isActive ? 'outline' : 'ghost',
      }),
      className,
    )}
    {...props}
  />
)

const PaginationPrevious = ({
  className,
  ariaLabel = 'Go to previous page',
  label = 'Previous',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { ariaLabel?: string; label?: string }) => (
  <PaginationLink
    aria-label={ariaLabel}
    className={cn('gap-1 pl-2.5', className)}
    size="default"
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>{label}</span>
  </PaginationLink>
)

const PaginationNext = ({
  className,
  ariaLabel = 'Go to next page',
  label = 'Next',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { ariaLabel?: string; label?: string }) => (
  <PaginationLink
    aria-label={ariaLabel}
    className={cn('gap-1 pr-2.5', className)}
    size="default"
    {...props}
  >
    <span>{label}</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)

const PaginationEllipsis = ({
  className,
  label = 'More pages',
  ...props
}: React.ComponentProps<'span'> & { label?: string }) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">{label}</span>
  </span>
)

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
