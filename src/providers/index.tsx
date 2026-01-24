import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { LocaleProvider } from './Locale'
import { ThemeProvider } from './Theme'
import type { Locale } from '@/i18n'
import { defaultLocale } from '@/i18n'

export const Providers: React.FC<{
  children: React.ReactNode
  locale?: Locale
}> = ({ children, locale = defaultLocale }) => {
  return (
    <ThemeProvider>
      <LocaleProvider locale={locale}>
        <HeaderThemeProvider>{children}</HeaderThemeProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
