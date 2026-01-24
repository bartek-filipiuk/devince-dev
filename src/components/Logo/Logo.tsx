import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { className } = props
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'My Website'

  return (
    <svg
      className={clsx('max-w-[12rem] w-full h-[34px]', className)}
      viewBox="0 0 240 34"
      fill="currentColor"
      aria-label={`${siteName} Logo`}
    >
      <text x="0" y="26" fontSize="24" fontWeight="bold" letterSpacing="1">
        {siteName}
      </text>
    </svg>
  )
}
