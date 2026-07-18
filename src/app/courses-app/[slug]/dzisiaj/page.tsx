import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { resolveCohortContext, getTodayData } from '@/utilities/cohortActions'
import { unlockLabel, todayInTz, yesterdayInTz } from '@/utilities/cohortUnlock'
import { CheckinForm } from '../../_components/cohort/CheckinForm'
import { StreakBar } from '../../_components/cohort/StreakBar'

export const dynamic = 'force-dynamic'

export default async function DzisiajPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    const next = encodeURIComponent(getLocalizedPath(`/${slug}/dzisiaj`, locale))
    redirect(`${getLocalizedPath('/login', locale)}?next=${next}`)
  }

  // Nie-zapisany / self-paced / bez kohorty → jednolity redirect na sylabus.
  const ctx = await resolveCohortContext(payload, user, slug)
  if ('error' in ctx) redirect(getLocalizedPath(`/${slug}`, locale))

  const { programDay, state, streak, todayCheckin, yesterdayCheckin, lesson, unlocksAt } = await getTodayData(
    payload,
    user,
    ctx,
  )
  const { clock, cohort } = ctx
  const cfg = ctx.program.cohortConfig

  // Serializacja pól check-inu do klienta (bez funkcji, tylko dane).
  const fields = (cfg?.checkinFields ?? []).map((f) => ({
    key: f.key,
    label: f.label,
    fieldType: f.fieldType,
    min: f.min ?? null,
    max: f.max ?? null,
    options: (f.options ?? []).map((o) => ({ value: o.value, label: o.label })),
    section: f.section ?? null,
  }))
  const minimumLabel = cfg?.minimumLabel ?? 'Zrobione minimum'

  if (state === 'before')
    return (
      <section className="shell" style={{ maxWidth: 640, padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
        <h1 className="section-title">Startujemy {String(cohort.startDate).slice(0, 10)}</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>
          Twoja kohorta jeszcze nie wystartowała. Lekcja 1 odblokuje się w dniu startu o {cfg?.unlockHour ?? 6}:00.
        </p>
      </section>
    )

  if (state === 'after')
    return (
      <section className="shell" style={{ maxWidth: 640, padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
        <h1 className="section-title">Program zakończony 🎉</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>Zobacz swoje wyniki i utrzymaj rytm.</p>
        <Link href={getLocalizedPath(`/${slug}/postepy`, locale)} className="btn btn--primary btn--lg" style={{ marginTop: 32 }}>
          Zobacz postępy
        </Link>
      </section>
    )

  const todayStr = todayInTz(clock)
  const yesterday = yesterdayInTz(clock)
  const showYesterday = yesterdayCheckin === null && programDay - 1 >= 1

  return (
    <main className="shell" style={{ maxWidth: 640, padding: 'clamp(24px, 5vw, 48px) 0' }}>
      <header>
        <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>
          Dzień {programDay} z {clock.programLength}
        </p>
        <StreakBar streak={streak} />
      </header>

      <section style={{ marginTop: 32 }}>
        {lesson ? (
          <Link href={getLocalizedPath(`/${slug}/learn/${lesson.slug}`, locale)} className="course-card" style={{ display: 'block' }}>
            <span className="eyebrow">
              <i>Lekcja dnia</i>
            </span>
            <h2 className="course-card__title">{lesson.title}</h2>
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>Otwórz lekcję →</p>
          </Link>
        ) : (
          <div className="course-card" style={{ opacity: 0.8 }}>
            <p style={{ margin: 0 }}>🔒 {unlocksAt ? unlockLabel(programDay, clock) : 'Lekcja niedostępna'}</p>
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="section-title" style={{ fontSize: 18 }}>
          Check-in — dziś
        </h2>
        <CheckinForm
          programSlug={slug}
          date={todayStr}
          fields={fields}
          minimumLabel={minimumLabel}
          existing={todayCheckin}
        />
      </section>

      {showYesterday && !todayCheckin ? (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>Uzupełnij wczorajszy dzień</summary>
          <CheckinForm
            programSlug={slug}
            date={yesterday}
            fields={fields}
            minimumLabel={minimumLabel}
            existing={null}
          />
        </details>
      ) : null}
    </main>
  )
}
