import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dziękujemy',
}

export default function SuccessPage() {
  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
      <span className="eyebrow">
        <i>zakup potwierdzony</i>
      </span>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 720, marginTop: '16px', letterSpacing: '-0.03em' }}>
        Dziękujemy za zakup!
      </h1>
      <p
        style={{
          marginTop: '18px',
          fontSize: 'clamp(15px, 1.6vw, 18px)',
          color: 'var(--text-mut)',
          lineHeight: 1.55,
          maxWidth: '48ch',
          marginInline: 'auto',
        }}
      >
        Wysłaliśmy link do pobrania na Twój adres e-mail. Sprawdź też folder spam.
      </p>
      <div style={{ marginTop: '32px' }}>
        <Link className="btn btn--primary btn--lg" href="/">
          Wróć do sklepu
        </Link>
      </div>
    </section>
  )
}
