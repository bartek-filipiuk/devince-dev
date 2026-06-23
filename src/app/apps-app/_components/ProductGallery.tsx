'use client'
import { useEffect, useState } from 'react'

export interface GalleryItem {
  url: string
  alt: string
  caption: string | null
}

export function ProductGallery({ items, heading }: { items: GalleryItem[]; heading: string }) {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!items.length) return null

  return (
    <>
      <h2 className="product-gallery__h">{heading}</h2>
      <div className="pg-grid">
        {items.map((it, i) => (
          <figure key={i} className="pg-card">
            <button
              type="button"
              className="pg-shot"
              onClick={() => setActive(i)}
              aria-label={it.alt}
            >
              <img src={it.url} alt={it.alt} loading="lazy" />
            </button>
            {it.caption ? <figcaption className="pg-cap">{it.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      {active !== null ? (
        <div className="pg-lightbox" role="dialog" aria-modal="true" onClick={() => setActive(null)}>
          <button
            type="button"
            className="pg-lightbox__x"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            ×
          </button>
          <img src={items[active].url} alt={items[active].alt} />
        </div>
      ) : null}
    </>
  )
}
