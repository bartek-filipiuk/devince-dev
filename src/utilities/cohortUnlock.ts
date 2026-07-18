// Czysta matematyka dat trybu kohortowego. Jedyne miejsce w repo liczące
// odblokowania/dni programu — nikt inny nie duplikuje obliczeń dat.
// Bez zależności: wyłącznie Intl (repo nie ma date-fns).

export type CohortClock = {
  startDate: string // 'YYYY-MM-DD' (cohorts.startDate)
  unlockHour: number // pełna godzina lokalna, default 6
  timezone: string // IANA, default 'Europe/Warsaw'
  programLength: number // liczba dni programu
}

const DAY_MS = 86_400_000

function tzOffsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  )
  return asUtc - at.getTime()
}

// Instant UTC odpowiadający `hour:00` czasu ściennego `timeZone` w dniu `dateStr`.
// Przejścia DST w Europie zachodzą o 2:00/3:00 — godzina odblokowania 6:00 nigdy
// nie wpada w lukę, więc pojedyncza korekta offsetu jest dokładna.
function zonedInstant(dateStr: string, hour: number, timeZone: string): Date {
  const guess = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`)
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone))
}

export function datePlusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

export function dateInTz(now: Date, timeZone: string): string {
  // en-CA formatuje jako YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function unlockAt(day: number, clock: CohortClock): Date {
  return zonedInstant(datePlusDays(clock.startDate, day - 1), clock.unlockHour, clock.timezone)
}

export function isUnlocked(
  day: number,
  clock: CohortClock,
  now: Date = new Date(),
  isAdmin = false,
): boolean {
  if (day < 1 || day > clock.programLength) return false
  if (isAdmin) return true
  return now.getTime() >= unlockAt(day, clock).getTime()
}

export function programDay(clock: CohortClock, now: Date = new Date()): number {
  const today = dateInTz(now, clock.timezone)
  return Math.round((Date.parse(today) - Date.parse(clock.startDate)) / DAY_MS) + 1
}

export function todayInTz(clock: CohortClock, now: Date = new Date()): string {
  return dateInTz(now, clock.timezone)
}

export function yesterdayInTz(clock: CohortClock, now: Date = new Date()): string {
  return datePlusDays(dateInTz(now, clock.timezone), -1)
}

// Okno zapisu check-inu: wyłącznie dziś lub wczoraj (czas programu).
export function canWriteCheckin(dateStr: string, clock: CohortClock, now: Date = new Date()): boolean {
  return dateStr === todayInTz(clock, now) || dateStr === yesterdayInTz(clock, now)
}

// Najwyższy odblokowany dzień: 0 przed startem, clamp do programLength.
export function maxUnlockedDay(clock: CohortClock, now: Date = new Date()): number {
  const day = programDay(clock, now)
  if (day < 1) return 0
  const capped = Math.min(day, clock.programLength)
  return isUnlocked(capped, clock, now) ? capped : Math.max(0, capped - 1)
}

export function unlockLabel(day: number, clock: CohortClock, now: Date = new Date()): string {
  const at = unlockAt(day, clock)
  const hour = `${clock.unlockHour}:00`
  const diff = Math.round(
    (Date.parse(dateInTz(at, clock.timezone)) - Date.parse(dateInTz(now, clock.timezone))) / DAY_MS,
  )
  if (diff <= 0) return `odblokuje się dziś o ${hour}`
  if (diff === 1) return `odblokuje się jutro o ${hour}`
  const weekday = new Intl.DateTimeFormat('pl-PL', { timeZone: clock.timezone, weekday: 'long' }).format(at)
  if (diff < 7) return `odblokuje się w ${weekday} o ${hour}`
  const date = new Intl.DateTimeFormat('pl-PL', { timeZone: clock.timezone, day: 'numeric', month: 'long' }).format(at)
  return `odblokuje się ${date} (${weekday}) o ${hour}`
}
