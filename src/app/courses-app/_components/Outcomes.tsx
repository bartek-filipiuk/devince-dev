import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'

type Outcome = NonNullable<Program['outcomes']>[number]

/**
 * „Czego się nauczysz" — grid of numbered outcome cards (handoff `.outcomes`
 * / `.oc`) sourced from `program.outcomes`. Numbers are 1-based and padded.
 */
export function Outcomes({ outcomes, locale }: { outcomes: Outcome[]; locale: Locale }) {
  if (outcomes.length === 0) return null

  return (
    <section className="block">
      <div className="block__head">
        <span className="eyebrow">
          <i>01</i>
          {t(locale, 'courses.syllabus.outcomesEyebrow')}
        </span>
        <h2 className="section-title">{t(locale, 'courses.syllabus.outcomes')}</h2>
      </div>
      <div className="outcomes">
        {outcomes.map((o, i) => (
          <article className="oc" key={o.id ?? i}>
            <div className="n">{String(i + 1).padStart(2, '0')}</div>
            <h3>{o.title}</h3>
            {o.body ? <p>{o.body}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
