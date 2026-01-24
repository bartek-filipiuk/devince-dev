import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest, File } from 'payload'
import path from 'path'
import fs from 'fs'

const collections: CollectionSlug[] = [
  'categories',
  'media',
  'pages',
  'posts',
  'program',
  'projects',
  'forms',
  'form-submissions',
  'search',
]

const _globals: GlobalSlug[] = ['header', 'footer']

// Next.js revalidation errors are normal when seeding the database without a server running
// i.e. running `yarn seed` locally instead of using the admin UI within an active app
// The app is not running to revalidate the pages and so the API routes are not available
// These error messages can be ignored: `Error hitting revalidate route for...`
export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding database...')

  // Clear collections and globals
  payload.logger.info(`— Clearing collections and globals...`)

  // Clear header and footer globals (they have navItems)
  await payload.updateGlobal({
    slug: 'header',
    data: {
      navItems: [],
    },
    depth: 0,
    context: {
      disableRevalidate: true,
    },
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      navItems: [],
    },
    depth: 0,
    context: {
      disableRevalidate: true,
    },
  })

  // Clear collections
  await Promise.all(
    collections.map((collection) => payload.db.deleteMany({ collection, req, where: {} })),
  )

  await Promise.all(
    collections
      .filter((collection) => Boolean(payload.collections[collection].config.versions))
      .map((collection) => payload.db.deleteVersions({ collection, req, where: {} })),
  )

  payload.logger.info(`— Creating demo admin user...`)

  // Delete existing demo user if exists
  await payload.delete({
    collection: 'users',
    depth: 0,
    where: {
      email: {
        equals: 'admin@example.com',
      },
    },
  })

  // Create demo admin user
  await payload.create({
    collection: 'users',
    data: {
      name: 'Bartłomiej Filipiuk',
      email: 'admin@example.com',
      password: 'admin123',
    },
  })

  payload.logger.info(`— Creating pages...`)

  // Create Home page
  const homePage = await payload.create({
    collection: 'pages',
    draft: false,
    data: {
      title: 'Home',
      slug: 'home',
      hero: {
        type: 'none',
      },
      layout: [
        // Hero Section
        {
          blockType: 'glassHero',
          headline: 'Devins',
          subheadline: createRichText(
            'Zamieniam pomysły w rzeczywistość. Full-stack development, konsulting techniczny i integracja AI dla startupów i firm.',
          ),
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: '#services',
            label: 'Zobacz usługi',
            appearance: 'default',
          },
          secondaryCTA: {
            type: 'custom',
            reference: null,
            url: '#contact',
            label: 'Skontaktuj się',
            appearance: 'outline',
          },
        },
        // Services Section
        {
          blockType: 'features',
          sectionTitle: 'Usługi',
          sectionDescription:
            'Kompleksowa wiedza techniczna - od pomysłu przez wdrożenie i dalej.',
          features: [
            {
              icon: 'code',
              title: 'Web Development',
              description:
                'Aplikacje webowe, produkty SaaS i strony marketingowe w React, Next.js i nowoczesnych technologiach. Czysta architektura, która skaluje się z Twoim biznesem.',
            },
            {
              icon: 'users',
              title: 'Konsulting Techniczny',
              description:
                'Strategia technologiczna, przeglądy architektury i CTO-as-a-Service dla startupów. Ekspertyza bez kosztów korporacyjnego konsultingu.',
            },
            {
              icon: 'lightning',
              title: 'AI i Automatyzacja',
              description:
                'Integracja AI z Twoimi produktami. Funkcje oparte na LLM, automatyzacja workflow i rozwiązania AI, które dostarczają realną wartość biznesową.',
            },
          ],
        },
        // USP / Why Choose Section
        {
          blockType: 'features',
          sectionTitle: 'Dlaczego warto współpracować',
          sectionDescription:
            'Bezpośrednia komunikacja z ekspertem, który rozumie biznes i technologię.',
          features: [
            {
              icon: 'star',
              title: 'Full-Stack + AI',
              description:
                'Głęboka ekspertyza w tradycyjnym developmencie i najnowszych technologiach AI. Systemy, gdzie AI jest pierwszorzędnym obywatelem.',
            },
            {
              icon: 'heart',
              title: 'Osobiste podejście',
              description:
                'Rozmawiasz bezpośrednio z developerem, który pisze kod. Bez account managerów, bez nieporozumień, bez warstw biurokracji.',
            },
            {
              icon: 'globe',
              title: 'Od A do Z',
              description:
                'Od pomysłu przez architekturę, development, wdrożenie i utrzymanie. Jedna osoba, która ogarnia całość.',
            },
          ],
        },
        // Featured Projects Section
        {
          blockType: 'featuredProjects',
          sectionTitle: 'Wybrane projekty',
          sectionDescription: 'Kilka przykładów moich ostatnich realizacji.',
          limit: 3,
          ctaLabel: 'Zobacz wszystkie projekty',
          ctaUrl: '/projects',
        },
        // Newsletter Section
        {
          blockType: 'brevoSignup',
          listId: '4',
          headline: 'Bądź na bieżąco',
          description: createRichText(
            'Zapisz się do newslettera i otrzymuj informacje o nowych projektach, artykułach i wydarzeniach. Bez spamu, możesz wypisać się w każdej chwili.',
          ),
          placeholder: 'Twój adres email',
          buttonText: 'Zapisz się',
          successMessage: 'Dziękuję! Sprawdź swoją skrzynkę email, aby potwierdzić subskrypcję.',
          privacyLink: '/privacy',
        },
        // Contact CTA Section
        {
          blockType: 'contactCTA',
          headline: 'Gotowy zbudować coś wielkiego?',
          description: createRichText(
            'Porozmawiajmy o Twoim projekcie. Czy potrzebujesz aplikacji, wsparcia technicznego, czy integracji AI - pomogę zamienić Twoje pomysły w rzeczywistość.',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Rozpocznij rozmowę',
            appearance: 'default',
          },
          socialLinks: [
            {
              platform: 'github',
              url: 'https://github.com/devins',
            },
            {
              platform: 'linkedin',
              url: 'https://linkedin.com/in/bartlomiej-filipiuk',
            },
            {
              platform: 'twitter',
              url: 'https://x.com/devins',
            },
          ],
        },
      ],
      _status: 'published',
    },
  })

  // Create About page
  const aboutPage = await payload.create({
    collection: 'pages',
    draft: false,
    data: {
      title: 'About',
      slug: 'about',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'About Devins',
          subheadline: createRichText(
            "I'm Bartłomiej Filipiuk, a solo technical founder based in Wrocław, Poland. I build web applications, provide technical consulting, and help companies integrate AI into their products.",
          ),
        },
        {
          blockType: 'features',
          sectionTitle: 'My Approach',
          sectionDescription:
            'Combining technical depth with practical business understanding.',
          features: [
            {
              icon: 'code',
              title: 'Hands-On Development',
              description:
                'I personally deliver all client work. No outsourcing, no handoffs. You get direct access to the person building your product.',
            },
            {
              icon: 'lightning',
              title: 'Modern Stack',
              description:
                'React, Next.js, Node.js, PostgreSQL, and the latest AI tools. I stay current with technologies that actually improve development outcomes.',
            },
            {
              icon: 'users',
              title: 'Community Connected',
              description:
                'Active in the developer community through WrocDevs AI meetups. Connected to trends, tools, and best practices through hands-on involvement.',
            },
          ],
        },
        {
          blockType: 'contactCTA',
          headline: 'Want to Work Together?',
          description: createRichText(
            'I work with startups and established companies who need reliable technical execution and clear communication.',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Get in Touch',
            appearance: 'default',
          },
        },
      ],
      _status: 'published',
    },
  })

  // Create Projects page
  const projectsPage = await payload.create({
    collection: 'pages',
    draft: false,
    data: {
      title: 'Projects',
      slug: 'projects',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'Projects',
          subheadline: createRichText(
            'A selection of SaaS products, open source contributions, and client work.',
          ),
        },
        {
          blockType: 'features',
          sectionTitle: 'Featured Work',
          sectionDescription: 'Recent projects showcasing full-stack and AI capabilities.',
          features: [
            {
              icon: 'code',
              title: 'Client Project',
              description:
                'Full-stack application development for a tech startup. React frontend, Node.js backend, PostgreSQL database.',
            },
            {
              icon: 'lightning',
              title: 'AI Integration',
              description:
                'LLM-powered feature implementation for an established company. Custom workflows and intelligent automation.',
            },
            {
              icon: 'globe',
              title: 'Open Source',
              description:
                'Contributions to developer tools and utilities. Check GitHub for the latest projects and experiments.',
            },
          ],
        },
        {
          blockType: 'contactCTA',
          headline: 'Have a Project in Mind?',
          description: createRichText(
            "Let's discuss how I can help bring your idea to life.",
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Start a Project',
            appearance: 'default',
          },
        },
      ],
      _status: 'published',
    },
  })

  // Create Contact page
  const contactPage = await payload.create({
    collection: 'pages',
    draft: false,
    data: {
      title: 'Contact',
      slug: 'contact',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'Get in Touch',
          subheadline: createRichText(
            "Whether you have a project in mind, need technical advice, or just want to connect — I'd love to hear from you.",
          ),
        },
        {
          blockType: 'contactCTA',
          headline: 'Contact Information',
          description: createRichText(
            'Based in Wrocław, Poland. Working with clients nationwide and internationally (remote).',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Send Email',
            appearance: 'default',
          },
          socialLinks: [
            {
              platform: 'github',
              url: 'https://github.com/devins',
            },
            {
              platform: 'linkedin',
              url: 'https://linkedin.com/in/bartlomiej-filipiuk',
            },
            {
              platform: 'twitter',
              url: 'https://x.com/devins',
            },
            {
              platform: 'youtube',
              url: 'https://youtube.com/@devins',
            },
          ],
        },
      ],
      _status: 'published',
    },
  })

  // Create Privacy Policy page
  const privacyPage = await payload.create({
    collection: 'pages',
    draft: false,
    data: {
      title: 'Polityka prywatności',
      slug: 'privacy',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'heading',
                      tag: 'h1',
                      children: [
                        {
                          type: 'text',
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          text: 'Polityka prywatności',
                          version: 1,
                        },
                      ],
                      direction: 'ltr' as const,
                      format: '' as const,
                      indent: 0,
                      version: 1,
                    },
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          text: 'Strona w przygotowaniu. Wkrótce pojawi się tutaj polityka prywatności.',
                          version: 1,
                        },
                      ],
                      direction: 'ltr' as const,
                      format: '' as const,
                      indent: 0,
                      textFormat: 0,
                      version: 1,
                    },
                  ],
                  direction: 'ltr' as const,
                  format: '' as const,
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
      ],
      _status: 'published',
    },
  })

  payload.logger.info(`— Setting up navigation...`)

  // Setup Header navigation
  await payload.updateGlobal({
    slug: 'header',
    data: {
      navItems: [
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: homePage.id,
            },
            label: 'Home',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: aboutPage.id,
            },
            label: 'About',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/posts',
            label: 'Blog',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/projects',
            label: 'Projects',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/courses',
            label: 'Courses',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/workshops',
            label: 'Workshops',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/events',
            label: 'Events',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: contactPage.id,
            },
            label: 'Contact',
          },
        },
      ],
    },
  })

  // Setup Footer navigation
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      navItems: [
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: homePage.id,
            },
            label: 'Home',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: aboutPage.id,
            },
            label: 'About',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: projectsPage.id,
            },
            label: 'Projects',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: contactPage.id,
            },
            label: 'Contact',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: privacyPage.id,
            },
            label: 'Polityka prywatności',
          },
        },
      ],
      showSocialLinks: true,
      showContactInfo: true,
      showNewsletter: false,
    },
  })

  payload.logger.info(`— Setting up site settings...`)

  // Setup Site Settings
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Devins',
      contact: {
        email: 'contact@devince.dev',
        address: {
          city: 'Wrocław',
          country: 'Poland',
        },
      },
      socialLinks: [
        {
          platform: 'github',
          url: 'https://github.com/devins',
        },
        {
          platform: 'linkedin',
          url: 'https://linkedin.com/in/bartlomiej-filipiuk',
        },
        {
          platform: 'twitter',
          url: 'https://x.com/devins',
        },
        {
          platform: 'youtube',
          url: 'https://youtube.com/@devins',
        },
      ],
    },
  })

  // ========================================
  // SEED CONTENT: Categories, Posts, Programs
  // ========================================

  payload.logger.info(`— Creating categories...`)

  // Create AI & Automation category
  const aiCategory = await payload.create({
    collection: 'categories',
    data: {
      title: 'AI & Automatyzacja',
      slug: 'ai-automatyzacja',
    },
  })

  // Check for seed images (Docker: /app/seed-images, Local: public/media/seed)
  const dockerSeedDir = path.join(process.cwd(), 'seed-images')
  const localSeedDir = path.join(process.cwd(), 'public/media/seed')
  const seedImagesDir = fs.existsSync(dockerSeedDir) ? dockerSeedDir : localSeedDir
  const seedImagesExist = fs.existsSync(seedImagesDir)

  let postImage1: { id: number } | null = null
  let postImage2: { id: number } | null = null
  let courseImage: { id: number } | null = null
  let workshopImage: { id: number } | null = null
  let eventImage: { id: number } | null = null

  if (seedImagesExist) {
    payload.logger.info(`— Uploading seed images...`)

    // Helper to upload image if exists
    const uploadImage = async (filename: string, alt: string) => {
      const imagePath = path.join(seedImagesDir, filename)
      if (!fs.existsSync(imagePath)) {
        payload.logger.info(`  Skipping ${filename} - not found`)
        return null
      }

      const imageBuffer = fs.readFileSync(imagePath)
      const file: File = {
        name: filename,
        data: imageBuffer,
        mimetype: 'image/webp',
        size: imageBuffer.byteLength,
      }

      const media = await payload.create({
        collection: 'media',
        data: {
          alt,
        },
        file,
      })

      payload.logger.info(`  Uploaded: ${filename}`)
      return media
    }

    postImage1 = await uploadImage('post-ai-developer-2025.webp', 'AI zmienia pracę programisty')
    postImage2 = await uploadImage('post-llm-automation.webp', 'Automatyzacja z LLM')
    courseImage = await uploadImage('course-ai-product.webp', 'Kurs AI w Produkcie')
    workshopImage = await uploadImage('workshop-llm-integration.webp', 'Warsztaty integracji LLM')
    eventImage = await uploadImage('event-ai-meetup.webp', 'WrocDevs AI Meetup')
  } else {
    payload.logger.info(`— Skipping image upload (run 'npx tsx scripts/generate-images.ts' first)`)
  }

  payload.logger.info(`— Creating blog posts...`)

  // Get admin user for author
  const adminUser = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'admin@example.com',
      },
    },
  })

  const authorId = adminUser.docs[0]?.id

  // Blog Post 1: AI changes developer work
  await payload.create({
    collection: 'posts',
    draft: false,
    data: {
      title: 'Jak AI zmienia pracę programisty w 2025',
      slug: 'jak-ai-zmienia-prace-programisty-2025',
      heroImage: postImage1?.id || undefined,
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Sztuczna inteligencja fundamentalnie zmienia sposób, w jaki piszemy kod. Narzędzia takie jak Claude Code, GitHub Copilot czy Cursor stały się nieodłącznym elementem codziennej pracy wielu programistów. Ale czy to oznacza, że nasze zawody są zagrożone? Wręcz przeciwnie.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'AI jako supermoc, nie zamiennik',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Asystenci AI nie zastępują programistów - wzmacniają ich możliwości. Rutynowe zadania, które kiedyś zajmowały godziny (boilerplate, testy jednostkowe, dokumentacja), teraz zajmują minuty. To pozwala skupić się na tym, co naprawdę ważne: architekturze, rozwiązywaniu problemów biznesowych i kreatywnym myśleniu.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Praktyczne zastosowania w codziennej pracy',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'W mojej codziennej pracy AI pomaga mi na kilka sposobów:',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 1,
                  mode: 'normal',
                  style: '',
                  text: 'Szybsze prototypowanie',
                  version: 1,
                },
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: ' - MVP, które kiedyś wymagało tygodnia pracy, teraz powstaje w kilka dni. AI generuje scaffolding, a ja skupiam się na logice biznesowej.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 1,
                  mode: 'normal',
                  style: '',
                  text: 'Lepsze code review',
                  version: 1,
                },
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: ' - AI analizuje kod pod kątem potencjalnych bugów, security issues i best practices. To jak mieć dodatkowego, niezmordowanego reviewera.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 1,
                  mode: 'normal',
                  style: '',
                  text: 'Nauka nowych technologii',
                  version: 1,
                },
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: ' - AI tłumaczy koncepty, pokazuje przykłady, odpowiada na pytania. Wchodzenie w nowy stack jest szybsze niż kiedykolwiek.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Co dalej?',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Przyszłość należy do programistów, którzy potrafią efektywnie współpracować z AI. Nie chodzi o to, czy używać tych narzędzi - chodzi o to, jak używać ich mądrze. Zrozumienie ich możliwości i ograniczeń to klucz do sukcesu w 2025 roku i później.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      },
      categories: [aiCategory.id],
      authors: authorId ? [authorId] : [],
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })

  // Blog Post 2: LLM workflow automation
  await payload.create({
    collection: 'posts',
    draft: false,
    data: {
      title: 'Automatyzacja workflow z LLM - praktyczny przewodnik',
      slug: 'automatyzacja-workflow-llm-praktyczny-przewodnik',
      heroImage: postImage2?.id || undefined,
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Large Language Models (LLM) to nie tylko chatboty. To potężne narzędzia do automatyzacji procesów biznesowych, które mogą zaoszczędzić setki godzin pracy miesięcznie. W tym artykule pokażę konkretne przykłady i praktyczne wskazówki.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Gdzie LLM sprawdzają się najlepiej?',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Nie każdy proces nadaje się do automatyzacji z LLM. Najlepsze wyniki uzyskasz w zadaniach wymagających:',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: '• Przetwarzania i analizy tekstu (maile, dokumenty, raporty)',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: '• Kategoryzacji i tagowania danych',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: '• Generowania treści na podstawie szablonów',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: '• Ekstrakcji informacji ze źródeł nieustrukturyzowanych',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Case study: Automatyzacja obsługi leadów',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Jeden z moich klientów otrzymywał dziesiątki zapytań dziennie przez formularz kontaktowy. Zespół sprzedaży spędzał godziny na ich sortowaniu i odpowiadaniu na powtarzające się pytania.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Rozwiązanie: Webhook + Claude API, który automatycznie kategoryzuje zapytania, odpowiada na FAQ, a gorące leady przekazuje do CRM z podsumowaniem potrzeb klienta. Rezultat? 70% redukcja czasu poświęconego na obsługę zapytań.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'heading',
              tag: 'h2',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Jak zacząć?',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Zacznij od małego pilota. Wybierz jeden proces, który jest czasochłonny i powtarzalny. Zbuduj prototyp, zmierz efekty, iteruj. Nie próbuj automatyzować wszystkiego naraz - to przepis na porażkę.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Potrzebujesz pomocy z integracją LLM w swojej firmie? Skontaktuj się ze mną - chętnie pomogę zaprojektować i wdrożyć rozwiązanie dopasowane do Twoich potrzeb.',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      },
      categories: [aiCategory.id],
      authors: authorId ? [authorId] : [],
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      _status: 'published',
    },
  })

  payload.logger.info(`— Creating programs...`)

  // Calculate future dates (1-3 months from now)
  const now = new Date()
  const courseStartDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 1 month
  const courseEndDate = new Date(courseStartDate.getTime() + 42 * 24 * 60 * 60 * 1000) // +6 weeks
  const workshopDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) // 1.5 months
  const eventDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 2 months

  // Course: AI in Product
  await payload.create({
    collection: 'program',
    draft: false,
    data: {
      title: 'AI w Produkcie: Od Koncepcji do Wdrożenia',
      slug: 'ai-w-produkcie-od-koncepcji-do-wdrozenia',
      type: 'course',
      heroImage: courseImage?.id || undefined,
      heroHeadline: 'Zbuduj produkt z AI od zera',
      heroDescription:
        'Kompleksowy kurs online pokazujący, jak zaprojektować, zbudować i wdrożyć produkt wykorzystujący sztuczną inteligencję. Praktyczne podejście, realne projekty, indywidualne wsparcie.',
      startDate: courseStartDate.toISOString(),
      endDate: courseEndDate.toISOString(),
      format: 'online',
      onlineLink: 'https://meet.google.com/xxx-yyyy-zzz',
      pricing: 'paid',
      duration: '6 tygodni',
      ctaLabel: 'Zapisz się na kurs',
      ctaUrl: 'https://forms.google.com/course-signup',
      layout: [
        {
          blockType: 'features',
          sectionTitle: 'Czego się nauczysz',
          sectionDescription: 'Program obejmuje wszystkie etapy tworzenia produktu z AI.',
          features: [
            {
              icon: 'code',
              title: 'Architektura AI',
              description:
                'Poznasz wzorce projektowe dla aplikacji LLM, nauczysz się projektować systemy RAG i agenty.',
            },
            {
              icon: 'lightning',
              title: 'Praktyczne API',
              description:
                'Hands-on z OpenAI, Claude API, embeddings. Dowiesz się, kiedy używać którego modelu.',
            },
            {
              icon: 'users',
              title: 'Projekt końcowy',
              description:
                'Zbudujesz własny produkt AI od pomysłu do działającego MVP z moim wsparciem.',
            },
          ],
        },
      ],
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })

  // Workshop: LLM Integration
  await payload.create({
    collection: 'program',
    draft: false,
    data: {
      title: 'Praktyczne Warsztaty: Integracja LLM z Twoją Aplikacją',
      slug: 'praktyczne-warsztaty-integracja-llm',
      type: 'workshop',
      heroImage: workshopImage?.id || undefined,
      heroHeadline: 'Jeden dzień, praktyczne umiejętności',
      heroDescription:
        'Intensywne warsztaty dla programistów, którzy chcą nauczyć się integrować LLM z istniejącymi aplikacjami. Przyniesiesz swój projekt, wyjdziesz z działającą integracją.',
      startDate: workshopDate.toISOString(),
      endDate: new Date(workshopDate.getTime() + 8 * 60 * 60 * 1000).toISOString(), // +8 hours
      format: 'hybrid',
      onlineLink: 'https://meet.google.com/workshop-link',
      locationName: 'Concordia Design',
      locationAddress: 'ul. Wyspa Słodowa 7\n50-266 Wrocław',
      pricing: 'paid',
      ctaLabel: 'Rezerwuj miejsce',
      ctaUrl: 'https://forms.google.com/workshop-signup',
      layout: [
        {
          blockType: 'features',
          sectionTitle: 'Agenda warsztatów',
          sectionDescription: 'Pełny dzień praktycznej nauki i kodowania.',
          features: [
            {
              icon: 'code',
              title: '9:00-12:00 Teoria',
              description:
                'Przegląd API, prompt engineering, streaming responses, obsługa błędów.',
            },
            {
              icon: 'lightning',
              title: '13:00-17:00 Praktyka',
              description:
                'Kodowanie własnej integracji z indywidualnym wsparciem i code review.',
            },
            {
              icon: 'users',
              title: '17:00-18:00 Q&A',
              description: 'Networking, dyskusja o case studies, planowanie kolejnych kroków.',
            },
          ],
        },
      ],
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })

  // Event: AI Meetup
  await payload.create({
    collection: 'program',
    draft: false,
    data: {
      title: 'WrocDevs AI Meetup: Przyszłość Programowania z AI',
      slug: 'wrocdevs-ai-meetup-przyszlosc-programowania',
      type: 'event',
      heroImage: eventImage?.id || undefined,
      heroHeadline: 'Dołącz do społeczności',
      heroDescription:
        'Wieczór z prezentacjami, dyskusjami i networkingiem dla wszystkich zainteresowanych AI w programowaniu. Bezpłatne wejście, pizza i napoje!',
      startDate: new Date(eventDate.setHours(18, 0, 0, 0)).toISOString(),
      endDate: new Date(eventDate.setHours(21, 0, 0, 0)).toISOString(),
      format: 'physical',
      locationName: 'Mleczarnia',
      locationAddress: 'ul. Włodkowica 5\n50-072 Wrocław',
      pricing: 'free',
      ctaLabel: 'Potwierdź obecność',
      ctaUrl: 'https://www.meetup.com/wrocdevs/events/123456',
      layout: [
        {
          blockType: 'features',
          sectionTitle: 'Program wydarzenia',
          sectionDescription: 'Trzy prezentacje i dużo czasu na networking.',
          features: [
            {
              icon: 'code',
              title: 'Talk: Claude Code w praktyce',
              description:
                'Jak używam AI do codziennej pracy programisty - demo na żywo i case studies.',
            },
            {
              icon: 'lightning',
              title: 'Talk: LLM w produkcji',
              description:
                'Lekcje z wdrożenia AI w aplikacji obsługującej tysiące użytkowników dziennie.',
            },
            {
              icon: 'users',
              title: 'Networking',
              description:
                'Pizza, piwo (lub kawa) i rozmowy o przyszłości programowania z AI.',
            },
          ],
        },
      ],
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })

  payload.logger.info(`— Creating projects...`)

  // Project 1: Videtion (ytforge-saas)
  await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'Videtion',
      slug: 'videtion',
      description: createRichText(
        'AI-powered video creation SaaS platform. Automate your video content production with intelligent templates, voiceover generation, and seamless publishing to YouTube and social media platforms.',
      ),
      technologies: [
        { name: 'Next.js' },
        { name: 'TypeScript' },
        { name: 'AI/LLM' },
        { name: 'Remotion' },
        { name: 'PostgreSQL' },
      ],
      githubUrl: 'https://github.com/bartek-filipiuk/ytforge-saas',
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })

  // Project 2: ScrapBlogPosts
  await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'ScrapBlogPosts',
      slug: 'scrap-blog-posts',
      description: createRichText(
        'Intelligent blog post scraping tool for content research and analysis. Extract, analyze, and organize content from multiple sources with AI-powered summarization and categorization.',
      ),
      technologies: [
        { name: 'Python' },
        { name: 'BeautifulSoup' },
        { name: 'OpenAI' },
        { name: 'SQLite' },
      ],
      githubUrl: 'https://github.com/bartek-filipiuk/blog-post-scraper',
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      _status: 'published',
    },
  })

  // Project 3: WrocDevs
  await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'WrocDevs',
      slug: 'wrocdevs',
      description: createRichText(
        'Community website for Wrocław developer meetups. Modern event management, speaker profiles, and community engagement features built for the local tech community.',
      ),
      technologies: [
        { name: 'Next.js' },
        { name: 'TypeScript' },
        { name: 'Payload CMS' },
        { name: 'TailwindCSS' },
      ],
      githubUrl: 'https://github.com/bartek-filipiuk/wrocdevs-next',
      productionUrl: 'https://wrocdevs.pl',
      publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
      _status: 'published',
    },
  })

  payload.logger.info('Seeded database successfully!')
  payload.logger.info('')
  payload.logger.info('=== DEVINS SITE READY ===')
  payload.logger.info('Admin login: admin@example.com / admin123')
  payload.logger.info('')
  payload.logger.info('Pages created:')
  payload.logger.info('  - Home (Hero PL, Usługi, Dlaczego warto, Projekty, Newsletter, CTA)')
  payload.logger.info('  - About')
  payload.logger.info('  - Projects')
  payload.logger.info('  - Contact')
  payload.logger.info('  - Privacy (Polityka prywatności)')
  payload.logger.info('')
  payload.logger.info('Content created:')
  payload.logger.info('  - 1 Category (AI & Automatyzacja)')
  payload.logger.info('  - 2 Blog posts')
  payload.logger.info('  - 3 Projects (Videtion, ScrapBlogPosts, WrocDevs)')
  payload.logger.info('  - 1 Course (AI w Produkcie)')
  payload.logger.info('  - 1 Workshop (Integracja LLM)')
  payload.logger.info('  - 1 Event (WrocDevs AI Meetup)')
  payload.logger.info('')
  payload.logger.info('Site settings configured with Devins branding')
  payload.logger.info('=========================')
}

// Utility function for fetching files - keep for future use in content generation
export async function fetchFileByURL(url: string): Promise<File> {
  const res = await fetch(url, {
    credentials: 'include',
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()

  return {
    name: url.split('/').pop() || `file-${Date.now()}`,
    data: Buffer.from(data),
    mimetype: `image/${url.split('.').pop()}`,
    size: data.byteLength,
  }
}

// Utility function for creating Lexical rich text - keep for content generation
export const createRichText = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})
