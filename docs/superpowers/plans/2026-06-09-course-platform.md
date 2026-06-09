# Platforma kursowa gated (`courses.devince.dev`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Płatny kurs hostowany za authem, per-user; dostęp nadawany automatycznie po zakupie przez Stripe (webhook), mail aktywacyjny przez Brevo, treść gated na subdomenie `courses.devince.dev`.

**Architecture:** Rozszerzamy istniejące modele Payload (`Program`, `Users`, `access`) — nowa kolekcja `Lessons`, pola `roles`/`purchases` na `Users`, funkcja access `enrolledOrAdmin`. Webhook Stripe (`checkout.session.completed`, weryfikacja podpisu + idempotencja przez kolekcję `StripeEvents`) tworzy/znajduje usera, dopisuje kupiony Program do `purchases` i wysyła mail aktywacyjny przez Brevo (link `set-password`). Gating egzekwowany SSR na stronach `/learn/*` i w authenticated route'ach do pobrań.

**Tech Stack:** Payload 3.67 (native auth, access functions, Local API), Next.js 15 route handlers, `stripe` SDK, Brevo `v3/smtp/email`, vitest (logika), Playwright (E2E auth flow). Kurs gated = PL-only v1.

**Spec:** `docs/superpowers/specs/2026-06-09-course-platform-design.md`

**Zależność:** `src/middleware.ts` współdzielony z planem lokalizacji. **B0 (host-check) dokładać po Task A1** (rewrite `[locale]`). `pnpm generate:types` po B1 odblokowuje B2/B3/B4.

**Prereq:** Task A0 z planu lokalizacji (harness vitest) musi istnieć. Jeśli plan B startuje pierwszy, wykonaj A0 najpierw.

---

### Task B1: Model danych — Lessons + Users(roles,purchases) + Program + StripeEvents

**Files:**
- Create: `src/collections/Lessons/index.ts`
- Create: `src/collections/StripeEvents/index.ts`
- Modify: `src/collections/Users/index.ts`
- Modify: `src/collections/Program/index.ts`
- Modify: `src/payload.config.ts`
- Create: `src/access/enrolledOrAdmin.ts`

- [ ] **Step 1: Access function `enrolledOrAdmin`**

```ts
// src/access/enrolledOrAdmin.ts
import type { Access } from 'payload'

export const enrolledOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true
  const ids = (user.purchases ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  return { program: { in: ids } }
}
```

- [ ] **Step 2: Kolekcja Lessons**

```ts
// src/collections/Lessons/index.ts
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { authenticated } from '../../access/authenticated'
import { enrolledOrAdmin } from '../../access/enrolledOrAdmin'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  access: {
    create: authenticated,
    delete: authenticated,
    read: enrolledOrAdmin,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'program', 'phase', 'order'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true },
    { name: 'phase', type: 'text', label: 'Faza' },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Kolejność' },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'text',
      options: [
        { label: 'Tekst', value: 'text' },
        { label: 'Embed', value: 'embed' },
        { label: 'Wideo', value: 'video' },
        { label: 'Do pobrania', value: 'download' },
      ],
    },
    { name: 'content', type: 'richText' },
    { name: 'youtubeEmbedUrl', type: 'text', label: 'YouTube embed (pomoc, opcjonalne)' },
    {
      name: 'downloadFile',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: (d) => d?.type === 'download' },
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
    slugField(),
  ],
  hooks: { beforeChange: [populatePublishedAt] },
  versions: { drafts: { autosave: { interval: 100 } }, maxPerDoc: 20 },
}
```

- [ ] **Step 3: Kolekcja StripeEvents (idempotencja)**

```ts
// src/collections/StripeEvents/index.ts
import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'

export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: 'eventId', hidden: true },
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'text' },
  ],
}
```

- [ ] **Step 4: Rozszerz Users (roles, purchases, access)**

Zastąp `fields` i `access` w `src/collections/Users/index.ts`:
```ts
  access: {
    admin: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    create: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    delete: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['customer'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
      ],
      access: { update: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')) },
    },
    { name: 'purchases', type: 'relationship', relationTo: 'program', hasMany: true },
  ],
```
**Uwaga migracja:** istniejący admin user musi dostać `roles: ['admin']` (Step 7).

- [ ] **Step 5: Rozszerz Program o pola Stripe**

W tabie „Szczegóły" `src/collections/Program/index.ts` (przy `pricing`) dodaj:
```ts
    {
      name: 'stripePaymentLink',
      type: 'text',
      label: 'Stripe Payment Link (dla płatnych)',
      admin: { condition: (data) => data?.pricing === 'paid' },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      label: 'Stripe Price ID (opcjonalnie)',
      admin: { condition: (data) => data?.pricing === 'paid' },
    },
```

- [ ] **Step 6: Zarejestruj kolekcje**

W `src/payload.config.ts` import `Lessons`, `StripeEvents` i dodaj do `collections`:
`collections: [Pages, Posts, Program, Lessons, Projects, Media, Categories, Users, StripeEvents],`

- [ ] **Step 7: Regeneruj typy + nadaj rolę admina**

Run: `pnpm generate:types`
Następnie w adminie (`pnpm dev`) ustaw istniejącemu userowi `roles: ['admin']` (albo skrypt seed `payload.update`). Expected: `payload-types.ts` ma `Lesson`, `User.roles`, `User.purchases`, `StripeEvent`.

- [ ] **Step 8: Weryfikacja**

Run: `pnpm lint && pnpm build`. Admin pokazuje kolekcje Lessons (ukryte StripeEvents), Users ma roles/purchases.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(course): Lessons + Users roles/purchases + Program Stripe fields + StripeEvents + enrolledOrAdmin access"
```

---

### Task B2: Gating — access test + strona /learn + gated downloads

**Files:**
- Create: `src/access/enrolledOrAdmin.test.ts`
- Create: `src/app/(frontend)/learn/[program]/[lesson]/page.tsx`
- Create: `src/app/(frontend)/learn/[program]/page.tsx` (spis lekcji)
- Create: `src/app/(frontend)/api/course/download/[id]/route.ts`

- [ ] **Step 1: Failing test access function**

```ts
// src/access/enrolledOrAdmin.test.ts
import { describe, it, expect } from 'vitest'
import { enrolledOrAdmin } from './enrolledOrAdmin'

const call = (user: any) => enrolledOrAdmin({ req: { user } } as any)

describe('enrolledOrAdmin', () => {
  it('denies anonymous', () => expect(call(null)).toBe(false))
  it('allows admin', () => expect(call({ roles: ['admin'] })).toBe(true))
  it('restricts customer to purchased programs', () => {
    expect(call({ roles: ['customer'], purchases: ['p1', { id: 'p2' }] }))
      .toEqual({ program: { in: ['p1', 'p2'] } })
  })
  it('customer with no purchases gets empty constraint', () => {
    expect(call({ roles: ['customer'], purchases: [] })).toEqual({ program: { in: [] } })
  })
})
```

- [ ] **Step 2: Uruchom**

Run: `pnpm test:int`
Expected: PASS (funkcja z B1 spełnia asercje).

- [ ] **Step 3: Strona lekcji z gatingiem SSR**

```tsx
// src/app/(frontend)/learn/[program]/[lesson]/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import RichText from '@/components/RichText'

export const dynamic = 'force-dynamic'

export default async function LessonPage({ params }: { params: Promise<{ program: string; lesson: string }> }) {
  const { program: programSlug, lesson: lessonSlug } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/login?next=/learn/${programSlug}/${lessonSlug}`)

  const prog = await payload.find({ collection: 'program', where: { slug: { equals: programSlug } }, limit: 1, overrideAccess: true })
  const program = prog.docs[0]
  if (!program) redirect('/account')

  const purchased = (user.purchases ?? []).map((p: any) => (typeof p === 'object' ? p.id : p))
  const isAdmin = user.roles?.includes('admin')
  if (!isAdmin && !purchased.includes(program.id)) redirect(`/program/${programSlug}`)

  const found = await payload.find({
    collection: 'lessons',
    where: { and: [{ program: { equals: program.id } }, { slug: { equals: lessonSlug } }] },
    limit: 1,
    user, // egzekwuje enrolledOrAdmin
  })
  const lesson = found.docs[0]
  if (!lesson) redirect('/account')

  return (
    <article className="lesson-page">
      <h1>{lesson.title}</h1>
      {lesson.youtubeEmbedUrl && (
        <div className="lesson-video">
          <iframe src={lesson.youtubeEmbedUrl} allowFullScreen title={lesson.title} />
        </div>
      )}
      {lesson.content && <RichText data={lesson.content as any} />}
    </article>
  )
}
```
(Jeśli `RichText` ma inną sygnaturę — dopasuj do istniejącego `src/components/RichText`.)

- [ ] **Step 4: Spis lekcji `/learn/[program]`**

Strona renderuje listę lekcji programu (sortowane `order`) z linkami do `/learn/[program]/[lesson]`, ten sam guard enrollmentu co Step 3.

- [ ] **Step 5: Gated download route**

```ts
// src/app/(frontend)/api/course/download/[id]/route.ts
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // findByID z user egzekwuje enrolledOrAdmin na lekcji
  let lesson
  try {
    lesson = await payload.findByID({ collection: 'lessons', id, depth: 1, user })
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const file: any = lesson?.downloadFile
  if (!file?.url) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.redirect(new URL(file.url, process.env.NEXT_PUBLIC_SERVER_URL))
}
```

- [ ] **Step 6: Weryfikacja**

Run: `pnpm test:int && pnpm lint && pnpm build`. Dev: jako customer bez zakupu `/learn/<prog>/<lesson>` → redirect `/program/<prog>`; z zakupem → treść.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(course): SSR enrollment gating for /learn + gated download route"
```

---

### Task B3: Auth kupującego — login / set-password / forgot / account

**Files:**
- Create: `src/app/(frontend)/login/page.tsx`
- Create: `src/app/(frontend)/set-password/page.tsx`
- Create: `src/app/(frontend)/forgot-password/page.tsx`
- Create: `src/app/(frontend)/account/page.tsx`

(Trasy locale-neutral — poza `[locale]`; formularze klienckie wołają REST Payload, który ustawia cookie `payload-token`.)

- [ ] **Step 1: Login page (klient)**

Formularz email+hasło → `POST /api/users/login` (`credentials: 'include'`). Po sukcesie `router.push(searchParams.next ?? '/account')`. Link do `/forgot-password`.

- [ ] **Step 2: Set-password page**

Czyta `token` z query. Formularz hasło+powtórz → `POST /api/users/reset-password` body `{ token, password }`. Po sukcesie auto-login (cookie ustawiony przez reset-password) → `/account`.

- [ ] **Step 3: Forgot-password page**

Formularz email → `POST /api/users/forgot-password` `{ email }` (Payload wyśle mail przez skonfigurowany adapter Brevo z B5; pokaż komunikat „sprawdź skrzynkę").

- [ ] **Step 4: Account page (SSR)**

```tsx
// src/app/(frontend)/account/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/login?next=/account')

  const purchasedIds = (user.purchases ?? []).map((p: any) => (typeof p === 'object' ? p.id : p))
  const programs = purchasedIds.length
    ? (await payload.find({ collection: 'program', where: { id: { in: purchasedIds } }, overrideAccess: true })).docs
    : []

  return (
    <section className="account">
      <h1>Twoje kursy</h1>
      {programs.length === 0 && <p>Nie masz jeszcze żadnych kursów.</p>}
      <ul>
        {programs.map((p: any) => (
          <li key={p.id}><Link href={`/learn/${p.slug}`}>{p.title}</Link></li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 5: Weryfikacja**

Run: `pnpm lint && pnpm build`. Dev: `/login`, `/forgot-password`, `/set-password?token=x`, `/account` renderują się; `/account` bez sesji → redirect login.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(course): buyer auth pages (login/set-password/forgot/account)"
```

---

### Task B4: Stripe — SDK, helper purchases (TDD), webhook

> **Kolejność:** webhook (Step 6) importuje `@/utilities/brevo` z Task B5. Wykonaj **B5 przed Step 6** (albo B4+B5 w jednej iteracji), inaczej build się wywali na brakującym imporcie.

**Files:**
- Modify: `package.json` (dep `stripe`)
- Create: `src/utilities/purchases.ts`
- Create: `src/utilities/purchases.test.ts`
- Create: `src/app/(frontend)/api/stripe/webhook/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Zainstaluj Stripe**

Run: `pnpm add stripe`

- [ ] **Step 2: Failing test helpera purchases**

```ts
// src/utilities/purchases.test.ts
import { describe, it, expect } from 'vitest'
import { addProgramToPurchases } from './purchases'

describe('addProgramToPurchases', () => {
  it('adds to empty', () => expect(addProgramToPurchases(null, 'p1')).toEqual(['p1']))
  it('normalizes object ids', () => expect(addProgramToPurchases([{ id: 'p1' }], 'p2')).toEqual(['p1', 'p2']))
  it('is idempotent', () => expect(addProgramToPurchases(['p1'], 'p1')).toEqual(['p1']))
})
```

- [ ] **Step 3: Uruchom — fail**

Run: `pnpm test:int`
Expected: FAIL (brak modułu).

- [ ] **Step 4: Implementacja helpera**

```ts
// src/utilities/purchases.ts
type Ref = string | { id: string }
export function addProgramToPurchases(existing: Ref[] | null | undefined, programId: string): string[] {
  const ids = (existing ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  return ids.includes(programId) ? ids : [...ids, programId]
}
```

- [ ] **Step 5: Uruchom — pass**

Run: `pnpm test:int`
Expected: PASS.

- [ ] **Step 6: Webhook route**

```ts
// src/app/(frontend)/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { addProgramToPurchases } from '@/utilities/purchases'
import { sendCourseAccessEmail } from '@/utilities/brevo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') ?? ''
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  const dup = await payload.find({ collection: 'stripe-events', where: { eventId: { equals: event.id } }, limit: 1, overrideAccess: true })
  if (dup.docs.length) return NextResponse.json({ received: true, duplicate: true })

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email ?? session.customer_email ?? undefined
    const programId = session.metadata?.programId
    if (email && programId) {
      const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
      let user = found.docs[0]
      let isNew = false
      if (!user) {
        user = await payload.create({ collection: 'users', data: { email, roles: ['customer'] }, overrideAccess: true })
        isNew = true
      }
      const purchases = addProgramToPurchases(user.purchases as any, programId)
      await payload.update({ collection: 'users', id: user.id, data: { purchases }, overrideAccess: true })
      const token = (await payload.forgotPassword({ collection: 'users', data: { email }, disableEmail: true })) as string
      await sendCourseAccessEmail({ to: email, token, isNew, programId })
    }
  }

  await payload.create({ collection: 'stripe-events', data: { eventId: event.id, type: event.type }, overrideAccess: true })
  return NextResponse.json({ received: true })
}
```
**Konfiguracja Payment Linka:** ustaw `metadata.programId` na Price/Payment Linku (Stripe Dashboard), żeby webhook wiedział, który Program nadać.

- [ ] **Step 7: Env example**

Dodaj do `.env.example`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_COURSES_URL=https://courses.devince.dev
```

- [ ] **Step 8: Weryfikacja (Stripe CLI)**

Run: `pnpm lint && pnpm build`. Lokalnie: `stripe listen --forward-to localhost:3010/api/stripe/webhook`, potem `stripe trigger checkout.session.completed`. Sprawdź: zły podpis → 400; podwójny event.id → `duplicate`; user dostaje `purchases` + mail (B5 musi być gotowe).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(course): Stripe webhook with signature verify + idempotency + access grant"
```

---

### Task B5: Brevo transactional — helper (TDD) + access email + adapter

**Files:**
- Create: `src/utilities/brevo.ts`
- Create: `src/utilities/brevo.test.ts`
- Modify: `src/payload.config.ts` (email adapter Brevo dla natywnych maili reset)
- Modify: `.env.example`

- [ ] **Step 1: Failing test helpera (mock fetch)**

```ts
// src/utilities/brevo.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendTransactionalEmail } from './brevo'

beforeEach(() => { process.env.BREVO_API_KEY = 'k'; vi.restoreAllMocks() })

describe('sendTransactionalEmail', () => {
  it('posts to Brevo with api-key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: '1' }) })
    vi.stubGlobal('fetch', fetchMock)
    await sendTransactionalEmail({ to: 'a@b.c', subject: 'S', htmlContent: '<p>x</p>' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('api.brevo.com/v3/smtp/email')
    expect((opts.headers as any)['api-key']).toBe('k')
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' }))
    await expect(sendTransactionalEmail({ to: 'a@b.c', subject: 'S', htmlContent: 'x' })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Uruchom — fail**

Run: `pnpm test:int`
Expected: FAIL (brak modułu).

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/brevo.ts
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export async function sendTransactionalEmail(args: {
  to: string
  subject?: string
  htmlContent?: string
  templateId?: number
  params?: Record<string, unknown>
}): Promise<unknown> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set')
  const body: Record<string, unknown> = { to: [{ email: args.to }] }
  if (args.templateId) { body.templateId = args.templateId; body.params = args.params }
  else { body.subject = args.subject; body.htmlContent = args.htmlContent }
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function sendCourseAccessEmail(args: { to: string; token: string; isNew: boolean; programId: string }) {
  const base = process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev'
  const link = `${base}/set-password?token=${args.token}`
  const templateId = process.env.BREVO_COURSE_ACCESS_TEMPLATE_ID
  if (templateId) {
    return sendTransactionalEmail({ to: args.to, templateId: Number(templateId), params: { activationLink: link } })
  }
  return sendTransactionalEmail({
    to: args.to,
    subject: 'Twój dostęp do kursu',
    htmlContent: `<p>Dziękujemy za zakup. Ustaw hasło i wejdź do kursu:</p><p><a href="${link}">${link}</a></p>`,
  })
}
```

- [ ] **Step 4: Uruchom — pass**

Run: `pnpm test:int`
Expected: PASS.

- [ ] **Step 5: Email adapter dla natywnego resetu (opcjonalne, zalecane)**

Skonfiguruj `email` w `payload.config.ts` na Brevo SMTP (`@payloadcms/email-nodemailer` + Brevo SMTP creds), żeby `/api/users/forgot-password` wysyłał przez Brevo. Env: `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`. (Jeśli pominięte: forgot-password używać własnego endpointu z `sendTransactionalEmail` + `forgotPassword({ disableEmail: true })`.)

- [ ] **Step 6: Env example**

Dodaj: `BREVO_COURSE_ACCESS_TEMPLATE_ID=`, (opcj.) `BREVO_SMTP_USER=`, `BREVO_SMTP_KEY=`.

- [ ] **Step 7: Weryfikacja**

Run: `pnpm test:int && pnpm lint && pnpm build`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(course): Brevo transactional helper + course access email"
```

---

### Task B0: Routing subdomeny `courses.devince.dev`

**Wykonać PO Task A1 (rewrite `[locale]`).**

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/utilities/getURL.ts` (jeśli buduje canonical/server URL)
- Modify: `src/payload.config.ts` (`cors`)

- [ ] **Step 1: Host-check w middleware**

W `src/middleware.ts` (wersja z A1) na początku, po wyłączeniach: wykryj `const host = request.headers.get('host') ?? ''; const isCourses = host.startsWith('courses.')`. Dla tras kursowych (`/learn`, `/login`, `/set-password`, `/forgot-password`, `/account`) **pomiń rewrite `[locale]`** (są locale-neutral) — dodaj te prefiksy do `EXCLUDED_PREFIXES`. Ustaw nagłówek `res.headers.set('x-app', isCourses ? 'courses' : 'main')` do kanonicznych linków.

- [ ] **Step 2: CORS + server URL**

W `payload.config.ts` `cors`: dodaj `process.env.NEXT_PUBLIC_COURSES_URL`. Upewnij się, że canonical/OG na trasach kursowych używają `NEXT_PUBLIC_COURSES_URL`.

- [ ] **Step 3: Coolify domena**

(Operacyjne, poza kodem) W Coolify dodaj `courses.devince.dev` jako dodatkową domenę aplikacji; DNS CNAME/A na serwer. Zweryfikuj TLS.

- [ ] **Step 4: Weryfikacja**

Run: `pnpm lint && pnpm build`. Po deployu: `https://courses.devince.dev/login` i `/account` działają; trasy marketingowe nadal na `devince.dev`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(course): courses.devince.dev subdomain host-aware middleware + CORS"
```

---

### Task B7: Import treści kursu

**Files:**
- Create: `scripts/import-course.ts`

- [ ] **Step 1: Skrypt importu lekcji**

Skrypt (uruchamiany `pnpm tsx scripts/import-course.ts`, `tsx` jest w devDeps): czyta `~/skills-projects/idea-to-mvp-course/curriculum/*.md`, dla każdego pliku tworzy/aktualizuje `Lessons` powiązane z Programem kursu (znajdź po slug), `phase`/`order` z nazwy pliku (`00-intro`→order 0, `01-setup`→1, `phase-A…`→…, `capstone-build-along`, `config-presets`, `resources`). Treść md→Lexical: reużyj konwertera z `mcp-server/src/tools/programs.ts` (`set_program_layout`) — wydziel funkcję `markdownToLexical` do współdzielonego modułu, jeśli trzeba.

- [ ] **Step 2: Assety download**

`dist/explorer.html`, `bundle/*.zip`, playbook PDF → upload do Media (`payload.create({ collection: 'media' })`), utwórz lekcje `type: 'download'`/`embed` z `downloadFile`/embedem. **NIE importuj `lead-magnet/`** (darmowy, osobny).

- [ ] **Step 3: Weryfikacja**

Run: `pnpm tsx scripts/import-course.ts`. Sprawdź w adminie: liczba `Lessons` = liczba lekcji w `curriculum/`; `order` rosnący; treść jako Lexical; pobrania mają plik.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(course): import script for curriculum lessons + downloadable assets"
```

---

## Self-Review (autor planu)

- **Pokrycie spec:** B1↔§B1, B2↔§B2, B3↔§B3, B4↔§B4, B5↔§B5, B0↔§B0, B7↔§B7. Wideo (§decyzje) = pole `youtubeEmbedUrl` w B1/B2. ✔
- **Placeholdery:** realny kod dla access fn, kolekcji, webhooka, brevo, gating, account; kroki operacyjne (Coolify, Stripe Dashboard metadata) jawnie oznaczone jako poza-kodem. ✔
- **Spójność typów:** `addProgramToPurchases` użyte w teście i webhooku tak samo; `enrolledOrAdmin` zwraca `boolean | { program: { in: [...] } }` spójnie w teście i kolekcji; `sendCourseAccessEmail`/`sendTransactionalEmail` sygnatury spójne między B4 i B5; `user.roles`/`user.purchases` zgodne z polami z B1. ✔
- **Kolejność:** B1→(B2/B3/B4)→B5(przed pełnym testem B4)→B7; B0 po A1. `generate:types` po B1. Uwaga: B4 Step 8 wymaga gotowego B5 (import `sendCourseAccessEmail`) — wykonać B5 przed testem webhooka end-to-end (kod kompiluje się niezależnie). ✔
- **Bezpieczeństwo:** webhook verify signature (raw body) + idempotencja (StripeEvents.unique) + `overrideAccess` tylko po stronie serwera; gating egzekwowany podwójnie (SSR redirect + Payload access na `lessons`). ✔
