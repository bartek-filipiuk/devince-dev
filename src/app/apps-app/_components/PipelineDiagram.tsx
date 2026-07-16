import type { Locale } from '@/i18n'

/**
 * idea-to-mvp pipeline, rendered as a native CSS/HTML diagram (no image asset).
 * Uses the apps-app theme tokens (--accent / --gate / --done / --font-mono) so it
 * reads as part of the storefront. Two variants:
 *  - full    → a vertical "spine" timeline (goes in the .product-desc section)
 *  - compact → a horizontal metro strip eye-catcher (goes in the cover slot)
 * Pure CSS entrance animation (staggered via --i), no client JS.
 */

type Node =
  | { kind: 'cap'; pl: string; en: string }
  | { kind: 'phase'; n: string; pl: string; en: string }
  | { kind: 'gate'; pl: string; en: string }

const NODES: Node[] = [
  { kind: 'cap', pl: 'Pomysł', en: 'Idea' },
  { kind: 'phase', n: '1–3', pl: 'Discovery i walidacja', en: 'Discovery & validation' },
  { kind: 'phase', n: '4–5', pl: 'Różnicowanie', en: 'Differentiation' },
  { kind: 'phase', n: '6–8', pl: 'Definicja produktu', en: 'Product definition' },
  { kind: 'phase', n: '9', pl: 'Brand', en: 'Brand' },
  { kind: 'phase', n: '10–17', pl: 'Fundament inżynierski', en: 'Engineering foundation' },
  { kind: 'phase', n: '18', pl: 'Legal', en: 'Legal' },
  { kind: 'phase', n: '19', pl: 'Design brief', en: 'Design brief' },
  { kind: 'gate', pl: 'Smoke test — czy ktoś tego chce?', en: 'Smoke test — does anyone want it?' },
  { kind: 'phase', n: '21–22', pl: 'Egzekucja — build loop (TDD)', en: 'Execution — build loop (TDD)' },
  { kind: 'gate', pl: 'Audyt bezpieczeństwa — 0 krytycznych?', en: 'Security audit — 0 critical?' },
  { kind: 'cap', pl: 'Wdrożony MVP + HANDOFF.md', en: 'Shipped MVP + HANDOFF.md' },
]

const MINI: Node[] = [
  { kind: 'cap', pl: 'Pomysł', en: 'Idea' },
  { kind: 'phase', n: '', pl: 'Walidacja', en: 'Validation' },
  { kind: 'gate', pl: 'Smoke test', en: 'Smoke test' },
  { kind: 'phase', n: '', pl: 'Build loop', en: 'Build loop' },
  { kind: 'gate', pl: 'Security', en: 'Security' },
  { kind: 'cap', pl: 'MVP', en: 'MVP' },
]

const T = {
  pl: { eyebrow: 'PIPELINE', sub: '24 etapy · 10 faz · 2 twarde bramki', gate: 'TWARDA BRAMKA' },
  en: { eyebrow: 'PIPELINE', sub: '24 stages · 10 phases · 2 hard gates', gate: 'HARD GATE' },
} as const

const lbl = (n: Node, locale: Locale) => (locale === 'en' ? n.en : n.pl)

export function PipelineDiagram({
  locale = 'pl',
  variant = 'full',
}: {
  locale?: Locale
  variant?: 'full' | 'compact'
}) {
  const t = T[locale === 'en' ? 'en' : 'pl']

  if (variant === 'compact') {
    return (
      <div className="pipe-mini" aria-hidden="true">
        <span className="pipe-mini__eyebrow">{t.eyebrow}</span>
        <ol className="pipe-mini__track">
          {MINI.map((n, i) => (
            <li
              key={i}
              className={`pipe-mini__stop pipe-mini__stop--${n.kind}`}
            >
              <span className="pipe-mini__dot" />
              <span className="pipe-mini__name">{lbl(n, locale)}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <figure className="pipe">
      <figcaption className="pipe__head">
        <span className="pipe__eyebrow">{t.eyebrow}</span>
        <span className="pipe__sub">{t.sub}</span>
      </figcaption>
      <ol className="pipe__flow">
        {NODES.map((n, i) => (
          <li
            key={i}
            className={`pipe__node pipe__node--${n.kind}`}
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <span className="pipe__marker" />
            {n.kind === 'cap' ? (
              <span className="pipe__cap">{lbl(n, locale)}</span>
            ) : (
              <span className="pipe__card">
                {n.kind === 'gate' ? (
                  <span className="pipe__tag">{t.gate}</span>
                ) : n.n ? (
                  <span className="pipe__num">{n.n}</span>
                ) : null}
                <span className="pipe__label">{lbl(n, locale)}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </figure>
  )
}
