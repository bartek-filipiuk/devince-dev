'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MarkCompleteButton({ lessonId, initialDone, nextHref, labels }: {
  lessonId: number
  initialDone: boolean
  nextHref: string | null
  labels: { complete: string; completeLast: string; completed: string; undo: string }
}) {
  const [done, setDone] = useState(initialDone)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function post(completed: boolean): Promise<boolean> {
    setBusy(true)
    try {
      const res = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, completed }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="markdone is-done">
        <span className="markdone__state">✓ {labels.completed}</span>
        <button
          type="button"
          className="markdone__undo"
          disabled={busy}
          onClick={async () => {
            if (await post(false)) setDone(false)
          }}
        >
          {labels.undo}
        </button>
        {nextHref ? (
          <button type="button" className="btn btn--ghost" onClick={() => router.push(nextHref)}>
            →
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn btn--primary btn--lg markdone__cta"
      disabled={busy}
      onClick={async () => {
        if (await post(true)) {
          setDone(true)
          if (nextHref) router.push(nextHref)
        }
      }}
    >
      <span className="icon" data-i="check" aria-hidden="true" />
      <span>{nextHref ? labels.complete : labels.completeLast}</span>
    </button>
  )
}
