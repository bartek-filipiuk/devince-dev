'use client'
import { useState } from 'react'

export function CopyButton({ code, copyLabel, copiedLabel }: {
  code: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="lc__copy"
      aria-label={copyLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  )
}
