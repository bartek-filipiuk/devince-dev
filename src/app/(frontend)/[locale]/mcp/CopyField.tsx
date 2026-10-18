'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

/** A value to paste somewhere else (connector URL, command, prompt) with a copy button. */
export function CopyField({
  value,
  label,
  event,
}: {
  value: string
  label: string
  event?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (event) track(event)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the value stays selectable */
    }
  }
  return (
    <div className="flex min-w-0 items-stretch bg-[hsl(222_28%_10%)] text-[hsl(210_20%_88%)] font-mono text-sm">
      <code
        tabIndex={0}
        className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-4 py-3 select-all"
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`${label}: kopiuj`}
        className="min-w-[7.5rem] shrink-0 border-l border-white/10 px-4 text-xs uppercase tracking-wider text-[hsl(215_85%_70%)] hover:bg-white/5"
      >
        {copied ? 'Skopiowane' : 'Kopiuj'}
      </button>
    </div>
  )
}
