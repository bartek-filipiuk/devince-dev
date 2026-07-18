import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { resolveCohortContext, getProgressData } from '@/utilities/cohortActions'
import { weeklyAvg } from '@/utilities/cohortProgress'
import { CompletionCard } from '../../_components/cohort/CompletionCard'
import { Heatmap } from '../../_components/cohort/Heatmap'
import { MeasurementForm } from '../../_components/cohort/MeasurementForm'
import { Sparkline } from '../../_components/cohort/Sparkline'

export const dynamic = 'force-dynamic'

export default async function PostepyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    const next = encodeURIComponent(getLocalizedPath(`/${slug}/postepy`, locale))
    redirect(`${getLocalizedPath('/login', locale)}?next=${next}`)
  }

  const ctx = await resolveCohortContext(payload, user, slug)
  if ('error' in ctx) redirect(getLocalizedPath(`/${slug}`, locale))

  const { checkins, measurements, completion } = await getProgressData(payload, user, ctx)
  const cfg = ctx.program.cohortConfig
  const points = (cfg?.measurementPoints ?? []).map((p) => ({ key: p.key, label: p.label }))
  const metrics = (cfg?.measurementMetrics ?? []).map((m) => ({
    key: m.key,
    label: m.label,
    unit: m.unit ?? '',
    min: m.min ?? null,
    max: m.max ?? null,
  }))
  const existing: Record<string, Record<string, number>> = {}
  for (const m of measurements) existing[m.point] = (m.values as never) ?? {}

  // Trendy: każde numeryczne pole check-inu z >= 2 punktami danych.
  const numericFields = (cfg?.checkinFields ?? []).filter((f) => f.fieldType === 'number')
  const trends = numericFields
    .map((f) => ({
      label: f.label,
      data: weeklyAvg(
        checkins
          .filter((c) => typeof c.values?.[f.key] === 'number')
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((c) => ({ date: c.date, value: c.values?.[f.key] as number })),
      ),
    }))
    .filter((t) => t.data.length >= 2)

  return (
    <main className="shell" style={{ maxWidth: 720, padding: 'clamp(24px, 5vw, 48px) 0' }}>
      <h1 className="section-title">Postępy</h1>

      <section style={{ marginTop: 32 }}>
        <h2 className="section-title" style={{ fontSize: 18 }}>
          Konsekwencja
        </h2>
        <CompletionCard completion={completion} minimumDaysTarget={cfg?.completion?.minimumDaysTarget ?? 0} />
        <Heatmap checkins={checkins} programLength={ctx.clock.programLength} startDate={ctx.clock.startDate} />
      </section>

      {points.length ? (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title" style={{ fontSize: 18 }}>
            Pomiary
          </h2>
          <table style={{ marginTop: 12, width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 0', textAlign: 'left', fontWeight: 500, opacity: 0.6 }}>Metryka</th>
                {points.map((p) => (
                  <th key={p.key} style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500, opacity: 0.6 }}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '8px 0' }}>
                    {m.label}
                    {m.unit ? ` (${m.unit})` : ''}
                  </td>
                  {points.map((p) => (
                    <td key={p.key} style={{ padding: '8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {existing[p.key]?.[m.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>Dodaj / popraw pomiar</summary>
            <MeasurementForm programSlug={slug} points={points} metrics={metrics} existing={existing} />
          </details>
        </section>
      ) : null}

      {trends.length ? (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title" style={{ fontSize: 18 }}>
            Trendy (średnia 7 dni)
          </h2>
          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gap: 24,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            {trends.map((t) => (
              <div key={t.label}>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>{t.label}</p>
                <Sparkline data={t.data} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
