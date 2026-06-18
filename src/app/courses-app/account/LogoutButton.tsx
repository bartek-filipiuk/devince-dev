'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

/** Course-themed logout: clears the Payload session then returns to /login. */
export function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore — redirect to login regardless.
    }
    router.push(getLocalizedPath('/login', locale))
  }

  return (
    <button className="btn btn--ghost" type="button" onClick={handleLogout} disabled={loading}>
      {loading ? t(locale, 'courses.auth.loggingOut') : t(locale, 'courses.auth.logout')}
    </button>
  )
}
