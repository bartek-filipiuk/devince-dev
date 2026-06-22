import './roadmap.css'
import { t, type Locale, type TranslationKey } from '@/i18n'
import type { Roadmap } from '@/payload-types'
import { groupByStatus } from './groupByStatus'

type RoadmapItem = NonNullable<Roadmap['items']>[number]

export function RoadmapView({ items, locale }: { items: RoadmapItem[]; locale: Locale }) {
  const groups = groupByStatus(items)

  return (
    <section className="shell roadmap">
      <header className="roadmap__head">
        <h1 className="section-title">{t(locale, 'roadmap.title')}</h1>
        <p className="roadmap__lead">{t(locale, 'roadmap.lead')}</p>
      </header>

      {groups.length === 0 ? (
        <p className="roadmap__empty">{t(locale, 'roadmap.empty')}</p>
      ) : (
        <div className="roadmap__groups">
          {groups.map((group) => (
            <div key={group.status} className={`roadmap__group roadmap__group--${group.status}`}>
              <h2 className="roadmap__group-title">
                <span className="roadmap__dot" aria-hidden />
                {t(locale, `roadmap.status.${group.status}` as TranslationKey)}
              </h2>
              <ul className="roadmap__list">
                {group.items.map((item, i) => (
                  <li key={item.id ?? i} className="roadmap__card">
                    <span className={`roadmap__chip roadmap__chip--${item.track}`}>
                      {t(locale, `roadmap.track.${item.track}` as TranslationKey)}
                    </span>
                    <h3 className="roadmap__card-title">{item.title}</h3>
                    {item.description ? (
                      <p className="roadmap__card-desc">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
