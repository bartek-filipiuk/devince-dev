# Boilerplate Complete Reference

> Comprehensive documentation of all available components, blocks, collections, and patterns in this Payload CMS + Next.js boilerplate.

---

## Architecture Overview

```
src/app/
├── (frontend)/     # Public website routes
│   ├── globals.css # Base styles (neutral, don't modify)
│   ├── theme.css   # ALL visual styling (customize this!)
│   └── layout.tsx  # Root layout
└── (payload)/      # CMS admin panel & API routes
```

### Core Principle

```
BOILERPLATE = Structure (HTML, semantic classes, layout)
YOU = Visual Identity (colors, effects, animations, component styles)
```

---

## Available Blocks (12 Total)

### 1. GlassHero

**Purpose:** Full-width hero section with headline, subheadline, dual CTAs, optional background media

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | text | yes | Main hero text |
| `subheadline` | richText | no | Supporting text |
| `primaryCTA` | link | no | Primary button |
| `secondaryCTA` | link | no | Secondary button |
| `backgroundMedia` | upload | no | Background image |

**CSS Classes:**
```
.hero-section        - Main section wrapper
.hero-background     - Background layer
.hero-content        - Content container
.hero-headline       - Main heading
.hero-subheadline    - Supporting text
.hero-cta-primary    - Primary button
.hero-cta-secondary  - Secondary button
.hero-overlay        - Image overlay
```

---

### 2. Features

**Purpose:** Grid of feature/service cards with icons, titles, descriptions, and optional links

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sectionTitle` | text | no | Section heading |
| `sectionDescription` | textarea | no | Section intro |
| `features` | array (1-8) | yes | Feature items |

**Feature item fields:**
| Field | Type | Required |
|-------|------|----------|
| `icon` | select | no |
| `title` | text | yes |
| `description` | textarea | yes |
| `linkUrl` | text | no |
| `linkLabel` | text | conditional |

**Available icons:**
```
calendar | book | users | star | code | globe | heart | lightning
```

**CSS Classes:**
```
.features-section      - Main section wrapper
.features-header       - Title and description container
.features-title        - Section heading
.features-description  - Section description
.features-grid         - Card grid container
.feature-card          - Individual card
.feature-icon          - Icon container
.feature-title         - Card heading
.feature-description   - Card text
.feature-link          - Card link
```

---

### 3. Testimonials

**Purpose:** Customer reviews/quotes with ratings, avatars, and author info

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sectionTitle` | text | no | Default: "What People Say" |
| `sectionDescription` | textarea | no | Section intro |
| `testimonials` | array (1-6) | yes | Review items |

**Testimonial item fields:**
| Field | Type | Required |
|-------|------|----------|
| `quote` | textarea | yes |
| `author` | text | yes |
| `role` | text | no |
| `avatar` | upload | no |
| `rating` | number (1-5) | no (default: 5) |

**CSS Classes:**
```
.testimonials-section      - Main section wrapper
.testimonials-header       - Title and description container
.testimonials-title        - Section heading
.testimonials-description  - Section description
.testimonials-grid         - Card grid container
.testimonial-card          - Individual card
.testimonial-rating        - Stars container
.testimonial-star          - Individual star (.filled for filled)
.testimonial-quote         - Quote text
.testimonial-author        - Author container
.testimonial-avatar        - Avatar image/placeholder
.testimonial-name          - Author name
.testimonial-role          - Author role
```

---

### 4. ContactCTA

**Purpose:** Contact section with email, phone, social links, optional form, and CTA button

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | text | yes | Default: "Ready to Get Started?" |
| `description` | richText | no | Supporting text |
| `form` | relationship | no | Link to form |
| `contactEmail` | email | no | Contact email |
| `contactPhone` | text | no | Phone number |
| `socialLinks` | array | no | Social media links |
| `primaryCTA` | link | no | Primary button |

**Social platforms:**
```
twitter | facebook | instagram | linkedin | youtube | github | discord
```

**CSS Classes:**
```
.contact-section       - Main section wrapper
.contact-background    - Background layer
.contact-content       - Content container
.contact-headline      - Main heading
.contact-description   - Description text
.contact-info          - Email/phone container
.contact-link          - Email/phone links
.contact-social        - Social links container
.contact-social-link   - Individual social link
.contact-cta           - Primary CTA button
```

---

### 5. CallToAction

**Purpose:** Simple CTA section with rich text and buttons

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `richText` | richText | CTA content (h1-h4 enabled) |
| `linkGroup` | array (max 2) | CTA buttons |

---

### 6. Content

**Purpose:** Flexible rich text with column layouts

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `columns` | array | Content columns |

**Column options:**
| Size | Description |
|------|-------------|
| `oneThird` | 33% width |
| `half` | 50% width |
| `twoThirds` | 66% width |
| `full` | 100% width |

---

### 7. MediaBlock

**Purpose:** Image/video display with positioning options

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `media` | upload | Media file |
| `position` | select | Image positioning |

---

### 8. ArchiveBlock

**Purpose:** Dynamic post/collection listing with filtering

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `relationTo` | select | Collection to display |
| `categories` | relationship | Filter by categories |
| `limit` | number | Items to show |

---

### 9. FormBlock

**Purpose:** Embed CMS-managed forms

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `form` | relationship | Reference to form |

---

### 10. Code

**Purpose:** Syntax-highlighted code blocks

---

### 11. Banner

**Purpose:** Alert/callout banners within rich text

**Styles:** `info | error | success | warning`

---

### 12. RelatedPosts

**Purpose:** Grid display of related blog posts (2-column layout)

---

## Collections

### Pages
- **Purpose:** Main content pages with block-based layout builder
- **Key fields:** title, slug, layout (blocks array), meta (SEO)
- **Features:** Drafts, versions (50), preview, autosave

### Posts
- **Purpose:** Blog/news content
- **Key fields:** title, content, categories, publishedAt, authors
- **Features:** Rich text with blocks, categories taxonomy

### Categories
- **Purpose:** Nested taxonomy for posts
- **Features:** Nested docs plugin, slug auto-generation

### Media
- **Purpose:** Image/file uploads
- **Sizes generated:** thumbnail (300px), square (500px), small (600px), medium (900px), large (1400px), xlarge (1920px), og (1200x630)
- **Features:** Focal point, alt text, captions

### Users
- **Purpose:** Admin authentication
- **Default:** admin@example.com / admin123

---

## Globals

### Header (`src/Header/config.ts`)

```typescript
{
  navItems: [
    {
      link: {
        type: 'reference' | 'custom',
        reference: { relationTo: 'pages', value: pageId },
        url: '/custom-path',
        label: 'Nav Label'
      }
    }
  ] // max 6 items
}
```

### Footer (`src/Footer/config.ts`)

```typescript
{
  navItems: [...],           // Same as header
  showSocialLinks: true,     // Toggle social icons
  showContactInfo: true,     // Toggle contact display
  showNewsletter: true,      // Toggle newsletter section
  newsletterTitle: string,
  newsletterDescription: string
}
```

### SiteSettings (`src/SiteSettings/config.ts`)

```typescript
{
  siteName: string,          // Required
  logo: Media,               // Optional upload
  contact: {
    email: string,
    phone: string,
    address: {
      street: string,
      city: string,
      postalCode: string,
      country: string
    }
  },
  socialLinks: [
    {
      platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'discord' | 'github' | 'tiktok',
      url: string
    }
  ]
}
```

---

## Theme System

### File Structure

```
globals.css  → Neutral base (CSS variables, structure) - DON'T MODIFY
theme.css    → ALL visual identity (colors, effects, animations) - CUSTOMIZE!
```

### CSS Variables (HSL Format)

Colors use HSL values without the `hsl()` wrapper:

```css
:root {
  /* Primary brand color */
  --primary: 220 70% 50%;
  --primary-foreground: 0 0% 100%;

  /* Secondary color */
  --secondary: 220 15% 95%;
  --secondary-foreground: 220 70% 20%;

  /* Accent color */
  --accent: 45 100% 50%;
  --accent-foreground: 0 0% 10%;

  /* Backgrounds */
  --background: 0 0% 100%;
  --foreground: 220 15% 10%;
  --card: 0 0% 100%;
  --card-foreground: 220 15% 10%;

  /* UI elements */
  --border: 220 15% 90%;
  --input: 220 15% 90%;
  --ring: 220 70% 50%;

  /* Semantic colors */
  --success: 150 60% 45%;
  --warning: 45 100% 55%;
  --error: 0 70% 55%;
  --muted: 220 15% 95%;
  --muted-foreground: 220 10% 45%;
}

[data-theme='dark'] {
  --background: 220 20% 10%;
  --foreground: 220 10% 95%;
  /* ... dark variants */
}
```

### Theme.css Sections

1. **Color Palette** - Light and dark mode HSL values
2. **Custom Effects** - Glass, gradients, glows (only if design requires)
3. **Custom Animations** - @keyframes (only if design requires)
4. **Component Overrides** - Style semantic CSS classes
5. **Typography** - Font customizations
6. **Responsive** - Breakpoint adjustments

---

## Seed Data Patterns

### Rich Text Helper

```typescript
export const createRichText = (text: string) => ({
  root: {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: [{
        type: 'text',
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        version: 1,
      }],
      direction: 'ltr',
      format: '',
      indent: 0,
      textFormat: 0,
      version: 1,
    }],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})
```

### Creating Pages with Blocks

```typescript
await payload.create({
  collection: 'pages',
  data: {
    title: 'Page Title',
    slug: 'page-slug',
    layout: [
      {
        blockType: 'glassHero',
        headline: 'Hero Headline',
        subheadline: createRichText('Subheadline text'),
        primaryCTA: {
          type: 'custom',
          url: '/contact',
          label: 'Get Started',
          appearance: 'default',
        },
      },
      {
        blockType: 'features',
        sectionTitle: 'Our Services',
        features: [
          {
            icon: 'star',
            title: 'Feature 1',
            description: 'Description text',
          },
        ],
      },
      {
        blockType: 'testimonials',
        sectionTitle: 'What Clients Say',
        testimonials: [
          {
            quote: 'Amazing service!',
            author: 'John Doe',
            role: 'CEO, Company',
            rating: 5,
          },
        ],
      },
      {
        blockType: 'contactCTA',
        headline: 'Ready to Start?',
        contactEmail: 'hello@example.com',
        contactPhone: '+48 123 456 789',
      },
    ],
    _status: 'published',
  },
})
```

### Block Type Mapping

| Display Name | blockType (for seed) |
|--------------|----------------------|
| GlassHero | `glassHero` |
| Features | `features` |
| Testimonials | `testimonials` |
| ContactCTA | `contactCTA` |
| CallToAction | `cta` |
| Content | `content` |
| MediaBlock | `mediaBlock` |
| Archive | `archive` |
| FormBlock | `formBlock` |

### Updating Globals

```typescript
// Header
await payload.updateGlobal({
  slug: 'header',
  data: {
    navItems: [
      { link: { type: 'custom', url: '/', label: 'Home' } },
      { link: { type: 'custom', url: '/services', label: 'Services' } },
      { link: { type: 'custom', url: '/contact', label: 'Contact' } },
    ],
  },
})

// Site Settings
await payload.updateGlobal({
  slug: 'site-settings',
  data: {
    siteName: 'My Business',
    contact: {
      email: 'hello@example.com',
      phone: '+48 123 456 789',
      address: {
        street: 'Main Street 123',
        city: 'Warsaw',
        postalCode: '00-001',
        country: 'Poland',
      },
    },
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com/mybusiness' },
      { platform: 'instagram', url: 'https://instagram.com/mybusiness' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/mybusiness' },
    ],
  },
})
```

---

## Extensible Components (Create When Needed)

These patterns are ready to implement when PAGE_DESIGN.md requires them:

### ScrollReveal

```typescript
// src/components/ScrollReveal/index.tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  delay?: number
}

export const ScrollReveal = ({ children, className = '', delay = 0 }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}
```

### AnimatedCounter

```typescript
// src/components/AnimatedCounter/index.tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}

export const AnimatedCounter = ({ end, duration = 2000, suffix = '', prefix = '' }: Props) => {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          let start = 0
          const step = end / (duration / 16)
          const timer = setInterval(() => {
            start += step
            if (start >= end) {
              setCount(end)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start))
            }
          }, 16)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration, started])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}
```

### Carousel (requires: pnpm add embla-carousel-react)

```typescript
// src/components/Carousel/index.tsx
'use client'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
}

export const Carousel = ({ children, className = '' }: Props) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <div className={`carousel-container relative ${className}`}>
      <div ref={emblaRef} className="carousel-viewport overflow-hidden">
        <div className="carousel-track flex">{children}</div>
      </div>
      <button onClick={scrollPrev} className="carousel-prev absolute left-2 top-1/2 -translate-y-1/2">←</button>
      <button onClick={scrollNext} className="carousel-next absolute right-2 top-1/2 -translate-y-1/2">→</button>
    </div>
  )
}
```

---

## Accessibility Requirements

### Text Over Images - CRITICAL

Always add overlay when placing text on images:

```css
/* Gradient overlay */
.hero-background {
  background:
    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)),
    url('/image.jpg') center/cover;
}
```

### WCAG Contrast Requirements

| Element | Minimum Ratio |
|---------|---------------|
| Body text | 4.5:1 |
| Large text (18px+) | 3:1 |
| UI components | 3:1 |

### Minimum Sizes

| Element | Minimum |
|---------|---------|
| Body font | 16px |
| Small text | 14px |
| H1 headlines | 32px |
| H2 headlines | 24px |
| Touch targets | 44x44px |
| Line height | 1.5 |

---

## Commands Reference

```bash
# Database
docker compose up -d          # Start PostgreSQL (port 5433)
docker compose down           # Stop database

# Development
pnpm install                  # Install dependencies
pnpm dev                      # Start dev server (localhost:3000)
pnpm build                    # Production build
pnpm lint                     # ESLint check
pnpm generate:types           # Regenerate TypeScript types

# Database operations
pnpm payload migrate          # Run migrations

# Trigger seed (browser)
http://localhost:3000/next/seed
```

---

## Key File Locations

| Purpose | Path |
|---------|------|
| **Theme (ALL visual styling)** | `src/app/(frontend)/theme.css` |
| Base styles (don't modify) | `src/app/(frontend)/globals.css` |
| SEO site name | `src/plugins/index.ts` |
| Seed data | `src/endpoints/seed/index.ts` |
| Block configs | `src/blocks/*/config.ts` |
| Block components | `src/blocks/*/Component.tsx` |
| Block renderer | `src/blocks/RenderBlocks.tsx` |
| Header config | `src/Header/config.ts` |
| Footer config | `src/Footer/config.ts` |
| Site settings | `src/SiteSettings/config.ts` |
| Pages collection | `src/collections/Pages/index.ts` |
| Link field | `src/fields/link.ts` |

---

## Environment Variables

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5433/payload
PAYLOAD_SECRET=your-secret-key-min-32-chars
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=My Website
PREVIEW_SECRET=preview-secret
```

---

## Localization

Pre-configured for:
- **Polish (pl)** - default
- **English (en)**

Configuration in `src/payload.config.ts`
