import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { JoinForm } from './JoinForm'

export const dynamic = 'force-dynamic'

/**
 * Strona dołączenia z zaproszenia (courses.devince.dev/join/<token>).
 * Renderuje formularz tylko dla aktywnego invite'a; nieaktywny (nieznany /
 * zużyty / przeterminowany) dostaje jeden wspólny komunikat — bez rozróżnienia.
 * Faktyczną walidację i atomowe zużycie tokenu robi POST /api/courses/join.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'course-invites',
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const invite = res.docs[0]
  const active =
    invite && !invite.usedAt && invite.expiresAt && Date.parse(String(invite.expiresAt)) > Date.now()
  const programTitle =
    invite && typeof invite.program === 'object' && invite.program ? invite.program.title : ''

  return (
    <section className="shell auth-shell">
      <div className="auth-card">
        {active ? (
          <>
            <header className="auth-head">
              <span className="eyebrow">
                <i>Zaproszenie</i>
              </span>
              <h1 className="section-title">Dołącz do kursu{programTitle ? ` ${programTitle}` : ''}</h1>
              <p className="auth-links">Konto zostanie założone dla: {invite.email}</p>
            </header>
            <JoinForm token={token} />
          </>
        ) : (
          <header className="auth-head">
            <span className="eyebrow">
              <i>Zaproszenie</i>
            </span>
            <h1 className="section-title">Zaproszenie jest nieaktywne</h1>
            <p className="auth-links">Link wygasł albo został już użyty. Poproś o nowe zaproszenie.</p>
          </header>
        )}
      </div>
    </section>
  )
}
