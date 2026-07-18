// Pasek streaka (dni z minimum). Bez kolorów w tsx — theme.css rządzi.
export function StreakBar({ streak }: { streak: number }) {
  const label = streak === 1 ? '1 dzień z minimum' : `${streak} dni z minimum`
  return (
    <p
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        fontSize: 18,
        fontWeight: 640,
      }}
    >
      <span aria-hidden>🔥</span> {label}
    </p>
  )
}
