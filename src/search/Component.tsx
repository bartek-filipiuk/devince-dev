'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/providers/Locale'
import { getLocalizedPath } from '@/utilities/getLocale'

export const Search: React.FC = () => {
  const [value, setValue] = useState('')
  const router = useRouter()
  const { t, locale } = useTranslation()

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    const searchPath = getLocalizedPath('/search', locale)
    router.push(`${searchPath}${debouncedValue ? `?q=${debouncedValue}` : ''}`)
  }, [debouncedValue, router, locale])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          {t('search.title')}
        </Label>
        <Input
          id="search"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder={t('search.title')}
        />
        <button type="submit" className="sr-only">
          {t('search.submit')}
        </button>
      </form>
    </div>
  )
}
