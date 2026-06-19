# devince External Content API — how to drive content from an agent

> For the next agent: this is how to **read/write devince content programmatically**
> (programs/courses, lessons, the course landing, prices, posts, projects, media).
> TL;DR: it's a **Bearer-token REST API at `https://devince.dev/api/external/...`**.
> There's also a devince MCP, but it's narrower — see "MCP vs API" below.

## Auth

Every request needs `Authorization: Bearer <EXTERNAL_API_TOKEN>`. The token is
compared timing-safe against `process.env.EXTERNAL_API_TOKEN` on the server
(`src/app/(frontend)/api/external/_lib/auth.ts`).

**The PROD token lives in Coolify env, NOT in the repo.** The local `.env`
`EXTERNAL_API_TOKEN` is a *different dev token* and will NOT work against
`https://devince.dev`. Read the prod token from Coolify:

```bash
CFG=$HOME/.config/coolify/config
URL=$(grep '^COOLIFY_URL=' "$CFG" | cut -d= -f2-); TOK=$(grep '^COOLIFY_TOKEN=' "$CFG" | cut -d= -f2-)
DEV=nwgk0s00440skc0kwsskw4w4   # the devince-dev Coolify app
EXT=$(curl -s -H "Authorization: Bearer $TOK" "$URL/api/v1/applications/$DEV/envs" \
  | python3 -c "import sys,json;e=json.load(sys.stdin);f=[x for x in e if x['key']=='EXTERNAL_API_TOKEN' and not x['is_preview']];print(f[0]['real_value'] or f[0]['value'])")
# prod token starts with 668e3ed0…  — use it: -H "Authorization: Bearer $EXT"
```

(Coolify env API returns each var twice — read the `is_preview==false` record and
its `.real_value`; `.value` is masked.)

## Base URL, locale, response shape

- Base: `https://devince.dev/api/external` (works from any host; not the
  `courses.`/`apps.` subdomains).
- Locale: most write routes take `?locale=pl|en` (default `pl`). Localized fields
  are written per-locale — set EN separately with `?locale=en`.
- Success → `{ "data": { … } }`. Error → `{ "error": { "code": "...", "message": "..." } }`
  (codes: `VALIDATION_ERROR`, `AUTH_MISSING`, `AUTH_INVALID`, `NOT_FOUND`, …).
- `[idOrSlug]` accepts a **numeric id OR a slug**.
- Course/syllabus pages are `force-dynamic` → writes show **immediately** on
  `courses.devince.dev` (no rebuild/redeploy needed for content). Schema/model
  changes still need a deploy + migration.

## Routes

| Route | Methods | Notes |
|---|---|---|
| `/programs` | POST | create a course/workshop/event |
| `/programs/[idOrSlug]` | PATCH, DELETE | scalar fields: title, hero*, pricing, `priceCents`, `currency`, `stripePaymentLink`, `stripePriceId`, phases, outcomes, audience, requirements, level, … |
| `/programs/[idOrSlug]/layout` | PUT | main-site `layout` blocks (Tailwind/shadcn — NOT shown on the courses-app page) |
| `/programs/[idOrSlug]/landing` | PUT | **course-native landing blocks** (shown on `courses.devince.dev/<slug>`, under the hero) |
| `/lessons` | POST | create a lesson |
| `/lessons/[idOrSlug]` | PATCH, DELETE | lesson fields incl. `why`/`what`/`dod` (teasers), `content` (richText), `youtubeEmbedUrl`, … |
| `/products/[idOrSlug]` | PATCH, DELETE | apps store products |
| `/products` | POST | create product |
| `/posts`, `/posts/[idOrSlug]` | POST, PATCH | blog |
| `/projects`, `/projects/[idOrSlug]` | POST, PATCH | portfolio |
| `/media` | POST | upload an image (returns a media id) |
| `/app-assets` | POST | private downloadable file for apps store |
| `/pages/[idOrSlug]/layout` | PUT | main-site Page layout blocks |

## Rich text: markdown is auto-converted

Rich-text fields accept **markdown strings**, auto-converted to Lexical server-side
(`_lib/markdown.ts`). The fields that convert are mapped in `RICH_TEXT_FIELDS`
(e.g. `cta.richText`, `courseRichText.body`). Plain `textarea` fields
(e.g. `courseCallout.body`, lesson `why`) are stored as-is — pass plain text.

## Course landing blocks (the `/landing` route)

The course landing is **course-native blocks** styled in `course-theme.css`
(the main-site `layout` blocks are Tailwind and render unstyled in the isolated
courses-app, so they're NOT used on the course page). Allowed `blockType`s + fields:

- `courseRichText` — `heading` (text), `body` (**markdown→richText**)
- `courseVideo` — `url` (YouTube/Vimeo/any https; normalized + https-gated via
  `src/utilities/embedUrl.ts`), `caption` (text)
- `courseImage` — `image` (media id, e.g. from `/media` POST), `caption` (text)
- `courseCallout` — `eyebrow`, `heading`, `body` (textarea/plain),
  `ctaLabel`, `ctaUrl` (e.g. `#curriculum-sec` to jump to the program list)

`PUT /programs/<idOrSlug>/landing` **replaces** the whole `landing` array.

## Gotchas

- **Paid course buy button needs a price.** A `pricing:"paid"` program only shows
  the "Kup dostęp" consent checkout when it has `stripePriceId` OR a numeric
  `priceCents` (+`currency`). Set it (`PATCH /programs/<id>` `{priceCents,currency}`)
  or the button hides. The checkout builds the Stripe line item from
  `stripePriceId` first, else inline `priceCents`+`currency`.
- **Lesson teaser** = the lesson `why` field; it renders as a 2-line teaser on the
  public syllabus. `PATCH /lessons/<slug>` `{ "why": "..." }`.
- **Localized**: write EN with `?locale=en`; PL is default.
- **Each devince redeploy = ~15s downtime** (single container; stop-old →
  migrate-on-boot → start-new). Content writes via this API need NO redeploy.

## MCP vs API

The devince MCP (`mcp__devince__*`) exists but is **narrower** than this API:
- Has: `create_program`, `update_program` (no price/stripe fields!),
  `set_program_layout` (the main-site `layout`, not `landing`), `upload_media`,
  `create_post`/`update_post`, `create_project`/`update_project`.
- **Does NOT have:** lessons, the course `landing`, products, app-assets, or
  program price/stripe fields.
- So for **lessons, course landing, prices, products → use this REST API.** The MCP
  is fine for quick program metadata / posts / projects / media.

## Worked examples

```bash
# Set a course price (unlocks the buy button)
curl -s -X PATCH -H "Authorization: Bearer $EXT" -H "Content-Type: application/json" \
  https://devince.dev/api/external/programs/16 -d '{"priceCents":4700,"currency":"pln"}'

# Set the course landing (replaces all landing blocks)
curl -s -X PUT -H "Authorization: Bearer $EXT" -H "Content-Type: application/json" \
  https://devince.dev/api/external/programs/16/landing -d '{
    "landing":[
      {"blockType":"courseRichText","heading":"…","body":"## Markdown\n\n- bullet"},
      {"blockType":"courseCallout","eyebrow":"…","heading":"…","body":"…",
       "ctaLabel":"Zobacz program ↓","ctaUrl":"#curriculum-sec"}
    ]}'

# Set a lesson teaser (the `why` field)
curl -s -X PATCH -H "Authorization: Bearer $EXT" -H "Content-Type: application/json" \
  https://devince.dev/api/external/lessons/faza-a--discovery--validation \
  -d '{"why":"Zwalidujesz, że problem jest prawdziwy — zanim napiszesz kod."}'

# Delete a junk lesson
curl -s -X DELETE -H "Authorization: Bearer $EXT" \
  https://devince.dev/api/external/lessons/tmp-i-dup
```

> Find program 16's lesson slugs without a list endpoint: scrape the syllabus —
> `curl -s https://courses.devince.dev/<courseSlug> | grep -oE '/learn/[a-z0-9-]+'`.
