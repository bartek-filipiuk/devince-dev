import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { AppAssets } from './collections/AppAssets'
import { Categories } from './collections/Categories'
import { ClaimGrants } from './collections/ClaimGrants'
import { LessonProgress } from './collections/LessonProgress'
import { CourseAssets } from './collections/CourseAssets'
import { DownloadGrants } from './collections/DownloadGrants'
import { Media } from './collections/Media'
import { Lessons } from './collections/Lessons'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Products } from './collections/Products'
import { Program } from './collections/Program'
import { Projects } from './collections/Projects'
import { StripeEvents } from './collections/StripeEvents'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { Roadmap } from './Roadmap/config'
import { Changelog } from './Changelog/config'
import { SiteSettings } from './SiteSettings/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  localization: {
    locales: [
      {
        label: 'Polski',
        code: 'pl',
      },
      {
        label: 'English',
        code: 'en',
      },
    ],
    defaultLocale: 'pl',
    fallback: true,
  },
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: false, // Use Payload migrations for deterministic deploys (no auto schema push)
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  collections: [
    Pages,
    Posts,
    Program,
    Lessons,
    Projects,
    Products,
    Media,
    CourseAssets,
    AppAssets,
    Categories,
    Users,
    StripeEvents,
    DownloadGrants,
    ClaimGrants,
    LessonProgress,
  ],
  cors: [getServerSideURL(), process.env.NEXT_PUBLIC_COURSES_URL, process.env.NEXT_PUBLIC_APPS_URL].filter(Boolean) as string[],
  globals: [Header, Footer, SiteSettings, Roadmap, Changelog],
  onInit: async (payload) => {
    // Publish any not-yet-ingested changelog fragments into the `changelog` global.
    // Skip during `next build` (no runtime DB writes); idempotent on every runtime boot.
    if (process.env.NEXT_PHASE === 'phase-production-build') return
    try {
      const { ingestChangelogFragments } = await import('./utilities/changelogIngest.js')
      const { ingested } = await ingestChangelogFragments({ payload })
      if (ingested.length) payload.logger.info(`Changelog: ingested ${ingested.length} fragment(s)`)
    } catch (err) {
      payload.logger.error({ err }, 'Changelog fragment ingest failed')
    }
  },
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
