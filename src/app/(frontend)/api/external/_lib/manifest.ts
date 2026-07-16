/**
 * Self-describing manifest for the external API, served at `GET /api/external`.
 * One machine-readable place an agent can read to learn the surface — resources,
 * methods, key fields, enum values, block types, and the cross-cutting conventions
 * (auth, locale, markdown rich-text, the {data}/{error} envelope) — without any
 * out-of-repo docs. Kept as a single typed object so it can't fragment across files;
 * a test (`manifest.test.ts`) guards that it covers every writable resource.
 */
export type ResourceManifest = {
  name: string
  collection?: string
  methods: Record<string, string>
  required?: Record<string, string>
  optional?: Record<string, string>
  enums?: Record<string, string[]>
  blocks?: string[]
  notes?: string
}

export type Manifest = {
  name: string
  version: number
  auth: { type: 'bearer'; header: string; note: string }
  conventions: {
    locale: string
    richText: string
    envelope: string
    idOrSlug: string
    read: string
  }
  resources: ResourceManifest[]
}

const TYPE = ['course', 'workshop', 'event']
const FORMAT = ['online', 'physical', 'hybrid']
const PRICING = ['free', 'paid']
const ACCESS_MODE = ['paid', 'lead-magnet']
const STATUS = ['draft', 'published']

export function buildManifest(): Manifest {
  return {
    name: 'External Content API',
    version: 1,
    auth: {
      type: 'bearer',
      header: 'Authorization: Bearer <EXTERNAL_API_TOKEN>',
      note: 'Single shared token (env EXTERNAL_API_TOKEN). Required on every endpoint, including this manifest.',
    },
    conventions: {
      locale: 'Add ?locale=pl|en to any request (default pl). Localized fields are written/read per locale; to update one locale without dropping the other, carry array-row ids from a prior GET/PATCH.',
      richText:
        'Rich-text/body fields accept markdown (auto-converted to Lexical) by default; pass contentFormat:"lexical" to send a raw Lexical object.',
      envelope: 'Success responses are { data: ... }; errors are { error: { code, message } }. Create returns 201, the others 200.',
      idOrSlug: 'The :idOrSlug path param accepts a numeric id or a slug.',
      read: 'GET list: ?page=&limit=(<=100)&slug=&status=&depth=(0-2). GET by-id: ?depth=(0-2, default 1). List returns { data: { items, page, limit, total, totalPages } }.',
    },
    resources: [
      {
        name: 'programs',
        collection: 'program',
        methods: {
          list: 'GET /api/external/programs',
          get: 'GET /api/external/programs/:idOrSlug',
          create: 'POST /api/external/programs',
          update: 'PATCH /api/external/programs/:idOrSlug',
          delete: 'DELETE /api/external/programs/:idOrSlug',
          setLanding: 'PUT /api/external/programs/:idOrSlug/landing',
          setLayout: 'PUT /api/external/programs/:idOrSlug/layout',
        },
        required: { title: 'string', type: 'enum:type' },
        optional: {
          _status: 'enum:status (default draft)',
          pricing: 'enum:pricing',
          priceCents: 'number',
          currency: 'string (e.g. PLN, USD)',
          stripePriceId: 'string',
          accessMode: 'enum:accessMode',
          heroHeadline: 'string',
          heroDescription: 'string',
          heroImage: 'media id (number)',
          format: 'enum:format',
          phases: 'array (syllabus phases)',
          outcomes: 'array',
          audience: 'string[]',
          requirements: 'string[]',
          level: 'string',
          featured: 'boolean',
          meta: 'object (SEO)',
        },
        enums: { type: TYPE, format: FORMAT, pricing: PRICING, accessMode: ACCESS_MODE, status: STATUS },
        notes:
          'A course = a program with type:"course" plus Lessons referencing it (lesson.program). To sell it set pricing:"paid" + priceCents/currency (or stripePriceId) — without a price the buy button is hidden. accessMode:"lead-magnet" gives it away for an email. Slug is auto-derived from title and not settable via the API.',
      },
      {
        name: 'lessons',
        collection: 'lessons',
        methods: {
          list: 'GET /api/external/lessons',
          get: 'GET /api/external/lessons/:idOrSlug',
          create: 'POST /api/external/lessons',
          update: 'PATCH /api/external/lessons/:idOrSlug',
          delete: 'DELETE /api/external/lessons/:idOrSlug',
        },
        required: { title: 'string', program: 'program id or slug' },
        optional: {
          _status: 'enum:status (NOTE: lessons default to "published")',
          body: 'markdown (or lexical) lesson content',
          order: 'number',
          isFree: 'boolean (free preview lesson)',
          dependencies: 'lesson ids[]',
          duration: 'string',
        },
        enums: { status: STATUS },
        notes: 'Lessons belong to a program (set program on create). Unlike programs, lessons default to _status:"published".',
      },
      {
        name: 'products',
        collection: 'products',
        methods: {
          list: 'GET /api/external/products',
          get: 'GET /api/external/products/:idOrSlug',
          create: 'POST /api/external/products',
          update: 'PATCH /api/external/products/:idOrSlug',
          delete: 'DELETE /api/external/products/:idOrSlug',
          notifyBuyers: 'POST /api/external/products/:idOrSlug/notify-buyers',
        },
        required: { title: 'string', priceCents: 'number' },
        optional: {
          _status: 'enum:status',
          currency: 'string',
          description: 'markdown',
          coverImage: 'media id (number)',
          downloadFiles: 'app-asset ids[] (the private file(s) the buyer downloads)',
          tiers: 'array (PATCH-only; per-locale price tiers)',
          screenshots: 'array (PATCH-only; image + caption)',
          stripePriceId: 'string',
        },
        enums: { status: STATUS },
        notes:
          'A downloadable product. Upload the private file to app-assets first, then reference its id in downloadFiles. tiers/screenshots are settable via PATCH, not on create.',
      },
      {
        name: 'posts',
        collection: 'posts',
        methods: {
          list: 'GET /api/external/posts',
          get: 'GET /api/external/posts/:idOrSlug',
          create: 'POST /api/external/posts',
          update: 'PATCH /api/external/posts/:idOrSlug',
        },
        required: { title: 'string' },
        optional: { _status: 'enum:status', content: 'markdown', categories: 'string[] (auto-created by name)', heroImage: 'media id', meta: 'object' },
        enums: { status: STATUS },
        notes: 'Blog posts. categories are matched/created by name.',
      },
      {
        name: 'projects',
        collection: 'projects',
        methods: {
          list: 'GET /api/external/projects',
          get: 'GET /api/external/projects/:idOrSlug',
          create: 'POST /api/external/projects',
          update: 'PATCH /api/external/projects/:idOrSlug',
        },
        required: { title: 'string' },
        optional: { _status: 'enum:status', content: 'markdown', technologies: 'string[]', githubUrl: 'url', productionUrl: 'url', heroImage: 'media id' },
        enums: { status: STATUS },
        notes: 'Portfolio projects.',
      },
      {
        name: 'media',
        collection: 'media',
        methods: {
          list: 'GET /api/external/media',
          create: 'POST /api/external/media (multipart form-data: field "file")',
        },
        notes: 'Public images (≤10MB). Upload returns the media id to reference in heroImage/coverImage. (The MCP upload_media tool also accepts a URL or base64.)',
      },
      {
        name: 'app-assets',
        collection: 'app-assets',
        methods: {
          list: 'GET /api/external/app-assets',
          create: 'POST /api/external/app-assets (multipart form-data: field "file")',
        },
        notes: 'Private downloadable files (≤200MB) for products. Upload returns the id to reference in product.downloadFiles.',
      },
      {
        name: 'header',
        methods: { get: 'GET /api/external/header', update: 'PATCH /api/external/header' },
        notes: 'Global site nav. PATCH replaces the full navItems array (carry ids to preserve the other locale).',
      },
      {
        name: 'roadmap',
        methods: { get: 'GET /api/external/roadmap', update: 'PATCH /api/external/roadmap' },
        notes: 'Public roadmap global. PATCH replaces the full items array.',
      },
      {
        name: 'changelog',
        methods: { get: 'GET /api/external/changelog', update: 'PATCH /api/external/changelog' },
        notes: 'Public changelog global. PATCH replaces the full entries array.',
      },
    ],
  }
}
