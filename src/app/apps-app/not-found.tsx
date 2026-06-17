import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0' }}>
      <div
        style={{
          maxWidth: '520px',
          background: 'var(--surface-1)',
          border: '1px solid var(--line-soft)',
          borderRadius: 'var(--r-card)',
          padding: 'clamp(24px, 4vw, 40px)',
        }}
      >
        <span className="eyebrow">
          <i>błąd</i>
        </span>
        <h1
          style={{
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 720,
            letterSpacing: '-0.03em',
            marginTop: '16px',
            marginBottom: '12px',
          }}
        >
          404 — nie ma takiej strony.
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '15px', color: 'var(--text-mut)', lineHeight: 1.6 }}>
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <Link className="btn btn--primary" href="/">
          Wróć do sklepu
        </Link>
      </div>
    </section>
  )
}
