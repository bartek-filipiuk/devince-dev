'use client'

import React, { createContext, useContext } from 'react'
import type { Locale } from '@/i18n'
import { defaultLocale, t as translate } from '@/i18n'
import type { TranslationKey } from '@/i18n/translations'

type LocaleContextType = {
  locale: Locale
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  t: (key) => key,
})

export function LocaleProvider({
  children,
  locale = defaultLocale,
}: {
  children: React.ReactNode
  locale?: Locale
}) {
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(locale, key, params)

  return (
    <LocaleContext.Provider value={{ locale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export function useTranslation() {
  const { t } = useLocale()
  return { t }
}
