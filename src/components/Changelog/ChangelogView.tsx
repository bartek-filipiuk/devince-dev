import './changelog.css'
import { t, type Locale, type TranslationKey } from '@/i18n'
import { sortEntriesDesc, formatChangelogDate, type ChangelogEntry } from './groupByDate'

/**
 * Public changelog feed (sibling of RoadmapView). Entries are rendered newest-first,
 * each as a dated group of tagged notes. Pages filter the notes by surface before
 * passing them in, so this component just renders what it's given.
 */
export function ChangelogView({ entries, locale }: { entries: ChangelogEntry[]; locale: Locale }) {
  const sorted = sortEntriesDesc(entries)

  return (
    <section className="shell changelog">
      <header className="changelog__head">
        <h1 className="section-title">{t(locale, 'changelog.title')}</h1>
        <p className="changelog__lead">{t(locale, 'changelog.lead')}</p>
      </header>

      {sorted.length === 0 ? (
        <p className="changelog__empty">{t(locale, 'changelog.empty')}</p>
      ) : (
        <div className="changelog__entries">
          {sorted.map((entry, i) => (
            <article key={entry.id ?? i} className="changelog__entry">
              <h2 className="changelog__date">{formatChangelogDate(entry.date, locale)}</h2>
              <ul className="changelog__list">
                {entry.notes.map((note, j) => (
                  <li key={note.id ?? j} className="changelog__note">
                    <span className={`changelog__chip changelog__chip--${note.tag}`}>
                      {t(locale, `changelog.tag.${note.tag}` as TranslationKey)}
                    </span>
                    <span className="changelog__text">{note.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
