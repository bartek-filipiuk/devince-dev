'use client'

import React, { useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import Link from 'next/link'
import { SearchIcon, Menu, X } from 'lucide-react'
import { useLocale } from '@/providers/Locale'
import { getLocalizedPath } from '@/utilities/getLocale'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { locale, t } = useLocale()

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="nav-desktop hidden md:flex gap-6 items-center">
        {navItems.map(({ link }, i) => {
          return <CMSLink key={i} {...link} locale={locale} appearance="link" className="nav-link text-sm font-medium uppercase tracking-wider" />
        })}
        <Link href={getLocalizedPath('/search', locale)}>
          <span className="sr-only">{t('header.search')}</span>
          <SearchIcon className="w-5 text-primary" />
        </Link>
        <span className="live-badge" aria-label="building in public">
          <span className="live-dot" aria-hidden="true" />
          building in public
        </span>
        <LanguageSwitcher />
      </nav>

      {/* Mobile Menu Button */}
      <div className="flex md:hidden items-center gap-2">
        <Link href={getLocalizedPath('/search', locale)}>
          <span className="sr-only">{t('header.search')}</span>
          <SearchIcon className="w-5 text-primary" />
        </Link>
        <LanguageSwitcher />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-primary"
          aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu */}
          <nav className="absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b shadow-lg">
            <div className="container py-4 flex flex-col gap-4">
              {navItems.map(({ link }, i) => {
                return (
                  <CMSLink
                    key={i}
                    {...link}
                    locale={locale}
                    appearance="link"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xl font-medium py-2 border-b border-border/50 last:border-0"
                  />
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
