import { t, type Locale } from '@/i18n'

type Item = { item: string; id?: string | null }

/**
 * Two `.infocard`s („Dla kogo" / „Czego potrzebujesz") rendering the
 * `audience` / `requirements` `{item}` arrays as check-mask bullet lists
 * (handoff `.cols` / `.infocard`).
 */
export function InfoCards({
  audience,
  requirements,
  locale,
}: {
  audience: Item[]
  requirements: Item[]
  locale: Locale
}) {
  if (audience.length === 0 && requirements.length === 0) return null

  return (
    <div className="cols">
      <Card title={t(locale, 'courses.infocards.audience')} items={audience} />
      <Card title={t(locale, 'courses.infocards.requirements')} items={requirements} />
    </div>
  )
}

function Card({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null
  return (
    <div className="infocard">
      <h3>{title}</h3>
      <ul>
        {items.map((it, i) => (
          <li key={it.id ?? i}>{it.item}</li>
        ))}
      </ul>
    </div>
  )
}
