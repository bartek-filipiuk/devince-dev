# Development Tips & Gotchas

> **Note:** For the main customization workflow, see `SETUP_PROMPT.md`. This file contains quick fixes and gotchas.

Quick reference for common issues and patterns when customizing this boilerplate.

---

## Files to Update for New Site

| What | File | Notes |
|------|------|-------|
| Logo text | `.env` | Set `NEXT_PUBLIC_SITE_NAME` environment variable |
| Site name (SEO) | `src/plugins/index.ts` | `SITE_NAME` constant |
| Theme colors | `src/app/(frontend)/theme.css` | HSL format without `hsl()` wrapper |
| Seed data | `src/endpoints/seed/index.ts` | Pages, navigation, settings |
| Home fallback | `src/endpoints/seed/home-static.ts` | Must exist (even empty) |

---

## Common Issues & Fixes

### 1. "Module not found: home-static"
**Problem**: `src/app/(frontend)/[slug]/page.tsx` imports `homeStatic`
**Fix**: Create `src/endpoints/seed/home-static.ts`:
```typescript
import type { RequiredDataFromCollectionSlug } from 'payload'

export const homeStatic: RequiredDataFromCollectionSlug<'pages'> = {
  id: 0,
  title: 'Home',
  slug: 'home',
  hero: { type: 'none' },
  layout: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
```

### 2. CSS @layer Error
**Problem**: `@layer components` in theme.css fails
**Fix**: Don't use `@layer` directives in theme.css - only use them in globals.css which has `@tailwind` directives

### 3. Link Field Validation Errors
**Problem**: "Document to link to" or "Label" required even for custom URLs
**Fix**: In `src/fields/link.ts`, ensure `required: false` on conditional fields:
```typescript
{ name: 'reference', required: false, ... }
{ name: 'url', required: false, ... }
{ name: 'label', required: false, ... }
```

### 4. Seed Route 403 Forbidden
**Problem**: `/next/seed` requires authentication
**Fix**: For development, simplify `src/app/(frontend)/next/seed/route.ts`:
```typescript
export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const payloadReq = await createLocalReq({}, payload)
  await seed({ payload, req: payloadReq })
  return Response.json({ success: true })
}

export async function GET(): Promise<Response> {
  return POST()
}
```

### 5. Content Invisible on Page
**Problem**: ScrollReveal animations keep content at `opacity: 0`
**Cause**: IntersectionObserver hasn't triggered
**Note**: Content appears when user scrolls - this is expected behavior

---

## Data Structures

### HSL Colors (theme.css)
```css
/* Format: H S% L% (no hsl wrapper, no commas) */
--primary: 220 70% 25%;
--secondary: 30 95% 50%;
```

### Rich Text (Lexical format)
> See PAGE_BOILERPLATE.md for complete `createRichText` helper function.

```typescript
// Quick reference - use createRichText('Your text here')
createRichText('Your paragraph text')
```

### Link Field
```typescript
// Internal link
{ type: 'reference', reference: { relationTo: 'pages', value: pageId }, label: 'Click' }

// External link
{ type: 'custom', url: '/path', label: 'Click' }

// Phone link
{ type: 'custom', url: 'tel:+48123456789', label: 'Call Us' }
```

### Feature Item
```typescript
{
  icon: 'star', // calendar|book|users|star|code|globe|heart|lightning
  title: 'Feature Title',
  description: 'Feature description text',
}
```

---

## Quick Commands

```bash
# Reset database (when schema conflicts)
psql -U postgres -c "DROP DATABASE payload; CREATE DATABASE payload;"

# Regenerate types after schema changes
pnpm generate:types

# Clear Next.js cache
rm -rf .next && pnpm dev

# Trigger seed (browser)
http://localhost:3000/next/seed
```

---

## Seed Data Checklist

1. Admin user (email + password)
2. Home page (slug: 'home')
3. Other pages (unique slugs)
4. Header global (navItems array)
5. Footer global (navItems + social enabled)
6. Site-settings global (siteName, contact, social URLs)

---

## Accessibility Quick Reference

### Text Over Images - CRITICAL

ALWAYS add overlay when placing text on images:

```css
/* Method 1: Gradient overlay (RECOMMENDED) */
.hero-background {
  background:
    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)),
    url('/image.jpg') center/cover;
}

/* Method 2: Pseudo-element overlay */
.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

/* Method 3: Text container background */
.hero-content {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 2rem;
}
```

### WCAG Contrast Requirements

| Element | Minimum Ratio | Example |
|---------|---------------|---------|
| Body text | 4.5:1 | Dark gray on white |
| Large text (18px+) | 3:1 | Headlines |
| UI components | 3:1 | Buttons, icons |

### Minimum Sizes

| What | Min | Why |
|------|-----|-----|
| Touch targets | 44x44px | Mobile accessibility |
| Body font | 16px | Readability |
| Small text | 14px | Never go below |
| H1 headlines | 32px | Visual hierarchy |
| H2 headlines | 24px | Visual hierarchy |
| Line height | 1.5 | Text legibility |

### Contrast Testing Tools

- Browser DevTools → Accessibility panel
- WebAIM: https://webaim.org/resources/contrastchecker/
- Lighthouse audit (Chrome DevTools)

### Quick Console Check
```javascript
// Get computed styles
getComputedStyle(element).color
getComputedStyle(element).backgroundColor
```
