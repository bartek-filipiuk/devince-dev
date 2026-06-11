import type { Program } from '@/payload-types'

type Outcome = NonNullable<Program['outcomes']>[number]

/**
 * „Czego się nauczysz" — grid of numbered outcome cards (handoff `.outcomes`
 * / `.oc`) sourced from `program.outcomes`. Numbers are 1-based and padded.
 */
export function Outcomes({ outcomes }: { outcomes: Outcome[] }) {
  if (outcomes.length === 0) return null

  return (
    <section className="block">
      <div className="block__head">
        <span className="eyebrow">
          <i>01</i>Efekty
        </span>
        <h2 className="section-title">Czego się nauczysz</h2>
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
