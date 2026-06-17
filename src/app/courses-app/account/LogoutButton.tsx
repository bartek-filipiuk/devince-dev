'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

/** Course-themed logout: clears the Payload session then returns to /login. */
export function LogoutButton() {
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
    router.push('/login')
  }

  return (
    <button className="btn btn--ghost" type="button" onClick={handleLogout} disabled={loading}>
      {loading ? 'Wylogowywanie…' : 'Wyloguj'}
    </button>
  )
}
