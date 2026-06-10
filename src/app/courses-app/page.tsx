/**
 * PLACEHOLDER storefront for courses.devince.dev.
 *
 * This is a temporary themed "wkrótce" landing so the /courses-app route
 * resolves. It will be replaced by the real storefront in task C3.
 */
export default function CoursesStorefrontPlaceholder() {
  return (
    <section className="shell" style={{ padding: '80px 0' }}>
      <span className="eyebrow">
        <i>Devince</i> kursy
      </span>
      <h1 className="section-title">Storefront wkrótce</h1>
      <p style={{ maxWidth: '52ch', color: 'var(--text-mut)', marginTop: '14px' }}>
        Budujemy katalog kursów. Niedługo zobaczysz tu pełną ofertę — kursy
        prowadzone na żywo z Claude&nbsp;Code, od pomysłu po wdrożone MVP.
      </p>
    </section>
  )
}
