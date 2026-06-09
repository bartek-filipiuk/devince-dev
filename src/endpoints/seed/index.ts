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
      title: 'O mnie',
      slug: 'about',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'O Devins',
          subheadline: createRichText(
            'Nazywam się Bartłomiej Filipiuk i jestem niezależnym founderem technicznym z Wrocławia. Buduję aplikacje webowe, doradzam w kwestiach technologicznych i pomagam firmom integrować AI z ich produktami.',
          ),
        },
        {
          blockType: 'features',
          sectionTitle: 'Moje podejście',
          sectionDescription:
            'Łączę głęboką wiedzę techniczną z praktycznym rozumieniem biznesu.',
          features: [
            {
              icon: 'code',
              title: 'Praca u podstaw',
              description:
                'Każdy projekt realizuję osobiście. Bez outsourcingu, bez przekazywania zadań dalej. Masz bezpośredni kontakt z osobą, która buduje Twój produkt.',
            },
            {
              icon: 'lightning',
              title: 'Nowoczesny stack',
              description:
                'React, Next.js, Node.js, PostgreSQL i najnowsze narzędzia AI. Trzymam rękę na pulsie technologii, które realnie poprawiają efekty pracy.',
            },
            {
              icon: 'users',
              title: 'Blisko społeczności',
              description:
                'Aktywnie działam w społeczności programistów dzięki meetupom WrocDevs AI. Jestem na bieżąco z trendami, narzędziami i dobrymi praktykami.',
            },
          ],
        },
        {
          blockType: 'contactCTA',
          headline: 'Chcesz nawiązać współpracę?',
          description: createRichText(
            'Współpracuję ze startupami i firmami, które potrzebują rzetelnej realizacji technicznej i jasnej komunikacji.',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Skontaktuj się',
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
      title: 'Projekty',
      slug: 'projects',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'Projekty',
          subheadline: createRichText(
            'Wybór produktów SaaS, projektów open source oraz realizacji dla klientów.',
          ),
        },
        {
          blockType: 'features',
          sectionTitle: 'Wybrane realizacje',
          sectionDescription: 'Ostatnie projekty pokazujące możliwości full-stack i AI.',
          features: [
            {
              icon: 'code',
              title: 'Projekt dla klienta',
              description:
                'Tworzenie aplikacji full-stack dla startupu technologicznego. Frontend w React, backend w Node.js, baza danych PostgreSQL.',
            },
            {
              icon: 'lightning',
              title: 'Integracja AI',
              description:
                'Wdrożenie funkcji opartych na LLM dla działającej firmy. Niestandardowe workflow i inteligentna automatyzacja.',
            },
            {
              icon: 'globe',
              title: 'Open source',
              description:
                'Wkład w narzędzia i biblioteki dla programistów. Najnowsze projekty i eksperymenty znajdziesz na GitHubie.',
            },
          ],
        },
        {
          blockType: 'contactCTA',
          headline: 'Masz pomysł na projekt?',
          description: createRichText(
            'Porozmawiajmy o tym, jak mogę pomóc wcielić Twój pomysł w życie.',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Rozpocznij projekt',
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
      title: 'Kontakt',
      slug: 'contact',
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'glassHero',
          headline: 'Skontaktuj się',
          subheadline: createRichText(
            'Masz pomysł na projekt, potrzebujesz porady technicznej albo po prostu chcesz nawiązać kontakt? Chętnie Cię wysłucham.',
          ),
        },
        {
          blockType: 'contactCTA',
          headline: 'Dane kontaktowe',
          description: createRichText(
            'Działam z Wrocławia. Współpracuję z klientami w całej Polsce i na świecie (zdalnie).',
          ),
          contactEmail: 'contact@devince.dev',
          primaryCTA: {
            type: 'custom',
            reference: null,
            url: 'mailto:contact@devince.dev',
            label: 'Wyślij e-mail',
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

  // Setup Header navigation (PL labels in default locale)
  const headerGlobal = await payload.updateGlobal({
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
            label: 'Start',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: aboutPage.id,
            },
            label: 'O mnie',
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
            label: 'Projekty',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/courses',
            label: 'Kursy',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/workshops',
            label: 'Warsztaty',
          },
        },
        {
          link: {
            type: 'custom',
            reference: null,
            url: '/events',
            label: 'Wydarzenia',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: contactPage.id,
            },
            label: 'Kontakt',
          },
        },
      ],
    },
  })

  // Setup Footer navigation (PL labels in default locale)
  const footerGlobal = await payload.updateGlobal({
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
            label: 'Start',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: aboutPage.id,
            },
            label: 'O mnie',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: projectsPage.id,
            },
            label: 'Projekty',
          },
        },
        {
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: contactPage.id,
            },
            label: 'Kontakt',
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
      // Localized newsletter copy (PL default slot); EN seeded later.
      newsletterTitle: 'Zapisz się do newslettera',
      newsletterDescription: 'Najnowsze aktualizacje prosto na Twoją skrzynkę.',
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
  const post1 = await payload.create({
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
  const post2 = await payload.create({
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
  const course = await payload.create({
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
  const workshop = await payload.create({
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
  const event = await payload.create({
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
  const projectVidetion = await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'Videtion',
      slug: 'videtion',
      description: createRichText(
        'Platforma SaaS do tworzenia wideo oparta na AI. Automatyzuje produkcję treści wideo dzięki inteligentnym szablonom, generowaniu lektora i bezproblemowej publikacji na YouTube oraz w mediach społecznościowych.',
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
  const projectScrap = await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'ScrapBlogPosts',
      slug: 'scrap-blog-posts',
      description: createRichText(
        'Inteligentne narzędzie do scrapowania wpisów blogowych na potrzeby researchu i analizy treści. Pobiera, analizuje i porządkuje materiały z wielu źródeł, korzystając z podsumowań i kategoryzacji opartych na AI.',
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
  const projectWrocDevs = await payload.create({
    collection: 'projects',
    draft: false,
    data: {
      title: 'WrocDevs',
      slug: 'wrocdevs',
      description: createRichText(
        'Strona społeczności wrocławskich meetupów programistycznych. Nowoczesne zarządzanie wydarzeniami, profile prelegentów i funkcje angażujące społeczność, zbudowane dla lokalnej sceny technologicznej.',
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

  // ========================================
  // SEED ENGLISH TRANSLATIONS (locale: 'en')
  // ========================================
  // PL is the default locale; the docs above were authored in Polish in the
  // default slot. Here we add real English values for the *localized* fields so
  // the /en site shows genuine English instead of falling back to Polish.
  //
  // NOTE: Page layout blocks (GlassHero/Features/ContactCTA) are NOT localized
  // fields, so their body text is shared across locales — we intentionally do
  // NOT send block bodies in EN updates (doing so would overwrite the PL text).
  // Only genuinely localized fields are translated below.
  payload.logger.info(`— Seeding English translations (locale: en)...`)

  const enCtx = { disableRevalidate: true }

  // Pages: only `title` is localized (block bodies are shared, see note above).
  await payload.update({
    collection: 'pages',
    id: homePage.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'Home',
      // Localized block fields on Home: Newsletter (BrevoSignup) + Featured Projects.
      // We must pass the existing block `id`s so Payload matches them to the
      // shared (non-localized) structure and only writes the localized leaves.
      layout: homePage.layout?.map((block) => {
        if (block.blockType === 'brevoSignup') {
          return {
            ...block,
            headline: 'Stay in the loop',
            description: createRichText(
              'Subscribe to the newsletter for updates on new projects, articles, and events. No spam, unsubscribe anytime.',
            ),
            placeholder: 'Your email address',
            buttonText: 'Subscribe',
            successMessage: 'Thanks! Check your inbox to confirm your subscription.',
          }
        }
        if (block.blockType === 'featuredProjects') {
          return {
            ...block,
            sectionTitle: 'Featured projects',
            sectionDescription: 'A few examples of my recent work.',
            ctaLabel: 'View all projects',
          }
        }
        return block
      }),
    },
  })

  await payload.update({
    collection: 'pages',
    id: aboutPage.id,
    locale: 'en',
    context: enCtx,
    data: { title: 'About' },
  })

  await payload.update({
    collection: 'pages',
    id: projectsPage.id,
    locale: 'en',
    context: enCtx,
    data: { title: 'Projects' },
  })

  await payload.update({
    collection: 'pages',
    id: contactPage.id,
    locale: 'en',
    context: enCtx,
    data: { title: 'Contact' },
  })

  // Posts: `title` + `content` are localized → seed full English bodies.
  await payload.update({
    collection: 'posts',
    id: post1.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'How AI Is Changing the Developer Job in 2025',
      content: buildArticleContent([
        {
          type: 'p',
          text: 'Artificial intelligence is fundamentally changing the way we write code. Tools like Claude Code, GitHub Copilot, and Cursor have become an inseparable part of many developers’ daily work. But does that mean our jobs are at risk? Quite the opposite.',
        },
        { type: 'h2', text: 'AI as a superpower, not a replacement' },
        {
          type: 'p',
          text: 'AI assistants don’t replace developers — they amplify them. Routine tasks that once took hours (boilerplate, unit tests, documentation) now take minutes. That frees you up to focus on what really matters: architecture, solving business problems, and creative thinking.',
        },
        { type: 'h2', text: 'Practical uses in everyday work' },
        { type: 'p', text: 'In my daily work, AI helps me in several ways:' },
        {
          type: 'pBold',
          bold: 'Faster prototyping',
          rest: ' — an MVP that used to take a week of work now comes together in a few days. AI generates the scaffolding, and I focus on the business logic.',
        },
        {
          type: 'pBold',
          bold: 'Better code review',
          rest: ' — AI analyzes code for potential bugs, security issues, and best practices. It’s like having an extra, tireless reviewer.',
        },
        {
          type: 'pBold',
          bold: 'Learning new technologies',
          rest: ' — AI explains concepts, shows examples, and answers questions. Getting into a new stack is faster than ever.',
        },
        { type: 'h2', text: 'What’s next?' },
        {
          type: 'p',
          text: 'The future belongs to developers who can collaborate effectively with AI. It’s not a question of whether to use these tools — it’s a question of how to use them wisely. Understanding their capabilities and limitations is the key to success in 2025 and beyond.',
        },
      ]),
    },
  })

  await payload.update({
    collection: 'posts',
    id: post2.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'Automating Workflows with LLMs — A Practical Guide',
      content: buildArticleContent([
        {
          type: 'p',
          text: 'Large Language Models (LLMs) are not just chatbots. They are powerful tools for automating business processes that can save hundreds of hours of work every month. In this article I’ll share concrete examples and practical tips.',
        },
        { type: 'h2', text: 'Where do LLMs work best?' },
        {
          type: 'p',
          text: 'Not every process is a good fit for LLM automation. You’ll get the best results on tasks that involve:',
        },
        { type: 'p', text: '• Processing and analyzing text (emails, documents, reports)' },
        { type: 'p', text: '• Categorizing and tagging data' },
        { type: 'p', text: '• Generating content from templates' },
        { type: 'p', text: '• Extracting information from unstructured sources' },
        { type: 'h2', text: 'Case study: automating lead handling' },
        {
          type: 'p',
          text: 'One of my clients received dozens of inquiries a day through their contact form. The sales team spent hours sorting them and answering the same repetitive questions.',
        },
        {
          type: 'p',
          text: 'The solution: a webhook + Claude API that automatically categorizes inquiries, answers FAQs, and forwards hot leads to the CRM with a summary of the customer’s needs. The result? A 70% reduction in the time spent handling inquiries.',
        },
        { type: 'h2', text: 'How to get started?' },
        {
          type: 'p',
          text: 'Start with a small pilot. Pick one process that is time-consuming and repetitive. Build a prototype, measure the impact, iterate. Don’t try to automate everything at once — that’s a recipe for failure.',
        },
        {
          type: 'p',
          text: 'Need help integrating LLMs into your company? Get in touch — I’ll gladly help you design and ship a solution tailored to your needs.',
        },
      ]),
    },
  })

  // Programs: localized fields = title, heroHeadline, heroDescription,
  // locationName, locationAddress, duration, ctaLabel. (layout blocks shared.)
  await payload.update({
    collection: 'program',
    id: course.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'AI in Your Product: From Concept to Deployment',
      heroHeadline: 'Build an AI product from scratch',
      heroDescription:
        'A comprehensive online course showing how to design, build, and ship a product powered by artificial intelligence. A hands-on approach, real projects, and individual support.',
      duration: '6 weeks',
      ctaLabel: 'Enroll in the course',
    },
  })

  await payload.update({
    collection: 'program',
    id: workshop.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'Hands-On Workshop: Integrating LLMs into Your App',
      heroHeadline: 'One day, practical skills',
      heroDescription:
        'An intensive workshop for developers who want to learn how to integrate LLMs into existing applications. Bring your own project and leave with a working integration.',
      locationName: 'Concordia Design',
      locationAddress: '7 Wyspa Słodowa St.\n50-266 Wrocław, Poland',
      ctaLabel: 'Reserve your spot',
    },
  })

  await payload.update({
    collection: 'program',
    id: event.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'WrocDevs AI Meetup: The Future of Programming with AI',
      heroHeadline: 'Join the community',
      heroDescription:
        'An evening of talks, discussions, and networking for everyone interested in AI in software development. Free entry, pizza, and drinks!',
      locationName: 'Mleczarnia',
      locationAddress: '5 Włodkowica St.\n50-072 Wrocław, Poland',
      ctaLabel: 'RSVP',
    },
  })

  // Projects: `title` (localized+required) and `description` (localized) →
  // include the title in the EN update (proper noun, same text) so EN-locale
  // validation passes, plus the English description.
  await payload.update({
    collection: 'projects',
    id: projectVidetion.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'Videtion',
      description: createRichText(
        'AI-powered video creation SaaS platform. Automate your video content production with intelligent templates, voiceover generation, and seamless publishing to YouTube and social media platforms.',
      ),
    },
  })

  await payload.update({
    collection: 'projects',
    id: projectScrap.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'ScrapBlogPosts',
      description: createRichText(
        'Intelligent blog post scraping tool for content research and analysis. Extract, analyze, and organize content from multiple sources with AI-powered summarization and categorization.',
      ),
    },
  })

  await payload.update({
    collection: 'projects',
    id: projectWrocDevs.id,
    locale: 'en',
    context: enCtx,
    data: {
      title: 'WrocDevs',
      description: createRichText(
        'Community website for Wrocław developer meetups. Modern event management, speaker profiles, and community engagement features built for the local tech community.',
      ),
    },
  })

  // Globals: Header/Footer nav `label` is a localized field. To seed EN labels
  // WITHOUT wiping the PL labels, we must reuse the existing navItem array `id`s
  // (and keep all non-localized link props identical) so Payload writes only the
  // `en` label slot on the same rows instead of recreating them.
  const headerEnLabels = ['Home', 'About', 'Blog', 'Projects', 'Courses', 'Workshops', 'Events', 'Contact']
  await payload.updateGlobal({
    slug: 'header',
    locale: 'en',
    context: enCtx,
    data: {
      navItems: (headerGlobal.navItems || []).map((item, index) => ({
        ...item,
        link: {
          ...item.link,
          label: headerEnLabels[index] ?? item.link?.label,
        },
      })),
    },
  })

  const footerEnLabels = ['Home', 'About', 'Projects', 'Contact', 'Privacy Policy']
  await payload.updateGlobal({
    slug: 'footer',
    locale: 'en',
    context: enCtx,
    data: {
      navItems: (footerGlobal.navItems || []).map((item, index) => ({
        ...item,
        link: {
          ...item.link,
          label: footerEnLabels[index] ?? item.link?.label,
        },
      })),
      // newsletterTitle/Description are localized; provide EN values too
      // (newsletter is hidden via showNewsletter:false, but kept consistent).
      newsletterTitle: 'Subscribe to our newsletter',
      newsletterDescription: 'Get the latest updates straight to your inbox.',
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

// --- Article content builders (used to seed full-length localized post bodies) ---

type ArticleNode =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'pBold'; bold: string; rest: string }

const textNode = (text: string, format = 0) => ({
  type: 'text' as const,
  detail: 0,
  format,
  mode: 'normal' as const,
  style: '',
  text,
  version: 1,
})

// Builds a Lexical rich-text document from a flat list of headings/paragraphs.
// Mirrors the node shape used by the Polish post bodies so PL/EN stay structurally identical.
export const buildArticleContent = (nodes: ArticleNode[]) => ({
  root: {
    type: 'root',
    children: nodes.map((node) => {
      if (node.type === 'h2') {
        return {
          type: 'heading',
          tag: 'h2',
          children: [textNode(node.text)],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        }
      }
      if (node.type === 'pBold') {
        return {
          type: 'paragraph',
          children: [textNode(node.bold, 1), textNode(node.rest)],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          textFormat: 0,
          version: 1,
        }
      }
      return {
        type: 'paragraph',
        children: [textNode(node.text)],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        version: 1,
      }
    }),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})
