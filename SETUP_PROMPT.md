# Claude Code Site Customization Guide

## Overview

This boilerplate provides **STRUCTURE ONLY** - minimal HTML with semantic CSS classes.
**YOU** create the visual identity based on PAGE_DESIGN.md.

Every site you generate should look **genuinely unique** because:
- Components have no hardcoded styles (no glass, gradients, or animations)
- All visual effects are created by you in `theme.css`
- PAGE_DESIGN.md drives all aesthetic decisions

---

## Core Principle

```
BOILERPLATE = Structure (HTML, semantic classes, layout)
YOU = Visual Identity (colors, effects, animations, component styles)
```

**Never rely on default styling. Always create custom visuals for each project.**

---

## Documentation Files

| File | Purpose |
|------|---------|
| **SETUP_PROMPT.md** | Customization workflow (YOU ARE HERE) |
| **PAGE_BOILERPLATE.md** | Technical reference - blocks, seed data |
| **PAGE_DEVTIPS.md** | Common issues, quick fixes |
| **PAGE_DESCRIPTION.md** | Business info (fill out) |
| **PAGE_DESIGN.md** | Visual design spec (fill out) |

---

## Environment Setup

### Docker (Recommended)

```bash
docker compose up -d        # Start PostgreSQL on port 5433
cp .env.example .env        # Copy environment
pnpm install                # Install dependencies
pnpm dev                    # Start dev server
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URI` | PostgreSQL connection (default: localhost:5433) |
| `NEXT_PUBLIC_SERVER_URL` | Public URL (default: http://localhost:3000) |
| `NEXT_PUBLIC_SITE_NAME` | Site name for SEO |
| `PAYLOAD_SECRET` | JWT secret (min 32 chars) |

---

## Step 1: Design Interpretation (CRITICAL)

### Read PAGE_DESIGN.md Thoroughly

Before writing any code, understand:
- Color philosophy and associations
- Visual style (modern, elegant, industrial, organic, etc.)
- Effects requested (glass, gradients, glows, textures)
- Animations requested (floats, pulses, reveals)
- Typography style
- Component-specific styling

### Generate `theme.css`

You must create ALL visual identity in `src/app/(frontend)/theme.css`:

#### Section 1: Colors

Interpret creative descriptions into HSL values:

```css
:root {
  /* Example: Racing theme */
  --primary: 0 85% 45%;      /* Crimson red - brake lights */
  --secondary: 0 0% 10%;     /* Carbon black */
  --accent: 45 100% 50%;     /* Warning yellow */
  --background: 0 0% 98%;
  --foreground: 0 0% 10%;
  /* ... all other variables */
}

[data-theme='dark'] {
  --primary: 0 80% 50%;
  --background: 0 0% 5%;
  /* ... dark variants */
}
```

#### Section 2: Custom Effects

If PAGE_DESIGN.md calls for glass, gradients, or glows:

```css
/* Glass morphism - only if design calls for it */
.glass {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--primary) / 0.15);
}

/* Gradient - match design spec */
.gradient-primary {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
}

/* Glow effect */
.glow-primary {
  box-shadow: 0 0 30px hsl(var(--primary) / 0.4);
}
```

#### Section 3: Custom Animations

If PAGE_DESIGN.md specifies animations:

```css
/* Example: Racing gauge animation */
.animate-gauge {
  animation: gauge-fill 1.5s ease-out forwards;
}

@keyframes gauge-fill {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}

/* Example: Pulse effect */
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.3); }
  50% { box-shadow: 0 0 40px hsl(var(--primary) / 0.6); }
}
```

#### Section 4: Component Styles

Style components to match design vision:

```css
/* Hero styling */
.hero-section {
  /* Add background patterns, textures */
}

.hero-background {
  background:
    url('/patterns/carbon-fiber.svg') repeat,
    linear-gradient(135deg, hsl(var(--secondary)), hsl(0 0% 5%));
}

.hero-headline {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* Add text gradient if design calls for it */
}

.hero-cta-primary {
  background: hsl(var(--primary));
  box-shadow: 0 0 30px hsl(var(--primary) / 0.4);
  transition: transform 0.3s, box-shadow 0.3s;
}

.hero-cta-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 0 50px hsl(var(--primary) / 0.6);
}

/* Feature cards */
.feature-card {
  border-left: 4px solid hsl(var(--primary));
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
}

/* Testimonials */
.testimonial-star.filled {
  color: hsl(var(--secondary));
}
```

---

## Step 2: Extend the Boilerplate (When PAGE_DESIGN.md Requires It)

### Extension Philosophy

This boilerplate is a **starting point, not a limitation**. If PAGE_DESIGN.md describes features that don't exist in the boilerplate, **CREATE THEM** - don't simplify the design to fit.

### When to Extend

| PAGE_DESIGN.md Says | Action Required |
|--------------------|-----------------|
| "Carousel of testimonials" | Install Embla Carousel, wrap block |
| "Animated statistics/counters" | Create AnimatedCounter component |
| "Scroll reveal effects" | Implement ScrollReveal with IntersectionObserver |
| "Timeline/milestones" | Create new Timeline block |
| "Video hero background" | Extend GlassHero with video support |
| "Gauge/circular progress" | Create GaugeChart SVG component |
| "Parallax effects" | Add CSS/JS parallax to hero |

### Quick Package Install

```bash
# Carousel
pnpm add embla-carousel-react

# Advanced animations
pnpm add framer-motion

# Icons (already installed, just import)
import { Wrench, Car, Shield } from 'lucide-react'
```

### Extension Checklist

When extending, ensure you:
1. Create component in `src/components/` or `src/blocks/`
2. Add semantic CSS classes for theme.css styling
3. Register blocks in RenderBlocks.tsx and Pages collection
4. Run `pnpm generate:types` after schema changes

### Block Creation Quick-Start

```bash
# 1. Create block files
src/blocks/MyBlock/config.ts    # Payload schema
src/blocks/MyBlock/Component.tsx # React component

# 2. Register in RenderBlocks.tsx
import { MyBlockComponent } from '@/blocks/MyBlock/Component'
// Add to blockComponents: myBlock: MyBlockComponent

# 3. Add to Pages collection
import { MyBlock } from '@/blocks/MyBlock/config'
// Add to blocks array

# 4. Generate types
pnpm generate:types
```

---

### Available Component Classes

Style these semantic classes in theme.css. For the **complete list with all blocks**, see `PAGE_BOILERPLATE.md` → "Available Blocks" section.

**Quick reference - main classes:**
- Hero: `.hero-section`, `.hero-headline`, `.hero-cta-primary`
- Features: `.features-section`, `.feature-card`, `.feature-icon`
- Testimonials: `.testimonials-section`, `.testimonial-card`, `.testimonial-quote`
- Contact: `.contact-section`, `.contact-cta`, `.contact-link`

---

## Step 2.5: Ensure WCAG Compliance

### Text Over Images - CRITICAL

When placing text over images, ALWAYS add overlays for readability:

```css
/* Dark overlay for light text */
.hero-background {
  background:
    linear-gradient(to bottom,
      rgba(0, 0, 0, 0.5),      /* 50% black overlay minimum */
      rgba(0, 0, 0, 0.7)),
    url('/images/hero.jpg') center/cover;
}

/* Alternative: Semi-transparent background on text container */
.hero-content {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 2rem;
  border-radius: 0.5rem;
}
```

### Contrast Requirements (WCAG AA)

| Element | Minimum Ratio | Check |
|---------|---------------|-------|
| Body text | 4.5:1 | Normal text on backgrounds |
| Large text (18px+) | 3:1 | Headlines, titles |
| UI components | 3:1 | Buttons, links, icons |

### Font Size Guidelines

| Element | Minimum Size | Recommended |
|---------|--------------|-------------|
| Body text | 16px | 16-18px |
| Small text | 14px | Avoid below 14px |
| Headlines H1 | 32px | 36-48px |
| Headlines H2 | 24px | 28-32px |
| Buttons | 16px | 16-18px |

### Image Sourcing

When PAGE_DESIGN.md specifies images (hero backgrounds, team photos, etc.):

1. **Search Unsplash/Pexels** for appropriate images matching the design description
2. **Download and add** to `public/images/` directory
3. **Always add overlay** when placing text over images
4. **Reference in theme.css**:
   ```css
   .hero-background {
     background:
       linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)),
       url('/images/hero-bg.jpg') center/cover;
   }
   ```

### Image Requirements
- Hero backgrounds: 1920x1080 minimum
- Team photos: 800x800 square
- Feature images: 600x400
- Optimize images (WebP preferred, compress JPG/PNG)

---

## Step 3: Create Seed Data & Content

Complete before running customization:

**PAGE_DESCRIPTION.md:**
- Business name and type
- Target audience
- Value propositions
- Required pages and sections
- Contact info

**PAGE_DESIGN.md:**
- Color philosophy (creative descriptions)
- Typography style
- Visual effects (glass, gradients, animations)
- Component-specific styling
- Page structure

---

## Step 4: Run Customization

Execute this prompt with Claude Code:

```
Based on PAGE_DESCRIPTION.md and PAGE_DESIGN.md, customize this boilerplate:

⚠️ CRITICAL: This is a BLANK CANVAS boilerplate.
   Components have NO default styling - YOU create ALL visual identity.

0. GENERATE theme.css (MOST IMPORTANT)
   - Interpret color descriptions → HSL values
   - Create custom effects if design calls for them (glass, gradients, glows)
   - Create animations if design specifies them
   - Style ALL component classes to match design vision
   - Include light AND dark mode variants
   - Verify visual identity is UNIQUE to this business

1. Update src/plugins/index.ts
   - Replace SITE_NAME with business name

2. Create seed data in src/endpoints/seed/
   - Generate pages with appropriate blocks
   - Create compelling content matching business type
   - Add testimonials, features, CTAs

3. Update Header navigation
   - Add nav items for each page

4. Update Footer navigation
   - Mirror header + add social links

5. Populate SiteSettings global
   - Set siteName, contact info, social links

6. Run pnpm generate:types

7. VERIFY:
   - theme.css has actual HSL values (no INTERPRET_FROM_PAGE_DESIGN)
   - Custom effects/animations match PAGE_DESIGN.md
   - Site looks UNIQUE, not like default boilerplate
```

---

## Step 5: Design Verification (MANDATORY)

### Recheck PAGE_DESIGN.md vs Implementation

Before finalizing, systematically verify EVERY element from PAGE_DESIGN.md:

#### Checklist:

**Colors:**
- [ ] Primary color matches design description
- [ ] Secondary color matches design description
- [ ] Accent colors implemented
- [ ] Dark mode variants work

**Effects:**
- [ ] Glass morphism (if specified)
- [ ] Gradients (if specified)
- [ ] Glows/shadows (if specified)
- [ ] Textures/patterns (if specified)

**Animations:**
- [ ] Hover effects on buttons
- [ ] Hover effects on cards
- [ ] Scroll animations (if specified)
- [ ] Loading/transition animations (if specified)

**Typography:**
- [ ] Font family matches design
- [ ] Font weights correct
- [ ] Letter spacing/line height

**Components:**
- [ ] Hero styling matches design
- [ ] Feature cards match design
- [ ] Testimonials match design
- [ ] Contact section matches design
- [ ] Navigation matches design
- [ ] Footer matches design

**Images:**
- [ ] All specified images sourced (Unsplash/Pexels)
- [ ] Text readable over images (overlay applied)
- [ ] Images optimized (WebP preferred)

**Accessibility:**
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Font sizes readable (min 16px body, min 32px H1)
- [ ] Focus states visible
- [ ] Alt text on images

### If Anything Missing:
1. Re-read the specific section of PAGE_DESIGN.md
2. Implement the missing effect/style
3. Re-verify until 100% complete

---

## Design Theme Examples

### Racing/Automotive Theme
```css
/* Colors */
--primary: 0 85% 45%;      /* Crimson red */
--secondary: 0 0% 10%;     /* Carbon black */
--accent: 45 100% 50%;     /* Warning yellow */

/* Effects */
.hero-background {
  background: url('/carbon-pattern.svg') repeat,
    linear-gradient(135deg, hsl(0 0% 5%), hsl(0 0% 10%));
}

.feature-card {
  border-left: 4px solid hsl(var(--primary));
}

.hero-cta-primary {
  box-shadow: 0 0 30px hsl(var(--primary) / 0.4);
}
```

### Nature/Organic Theme
```css
/* Colors */
--primary: 150 60% 35%;    /* Forest green */
--secondary: 35 80% 45%;   /* Warm wood */
--accent: 45 90% 55%;      /* Sunlight gold */

/* Effects */
.hero-background {
  background: linear-gradient(to bottom,
    hsl(150 40% 95%),
    hsl(150 30% 98%));
}

.feature-card {
  border-radius: 1rem;
  border: none;
  background: hsl(var(--card));
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
```

### Tech/Futuristic Theme
```css
/* Colors */
--primary: 270 85% 55%;    /* Electric violet */
--secondary: 180 90% 45%;  /* Cyan */
--accent: 330 100% 60%;    /* Magenta */

/* Effects */
.hero-background {
  background:
    radial-gradient(circle at 30% 50%, hsl(var(--primary) / 0.2), transparent 50%),
    radial-gradient(circle at 70% 80%, hsl(var(--secondary) / 0.2), transparent 50%),
    hsl(240 20% 8%);
}

.feature-card {
  background: hsl(var(--card) / 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid hsl(var(--primary) / 0.3);
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Site looks plain/unstyled | theme.css not generated → run Step 1 |
| Default grayscale colors | Replace INTERPRET_FROM_PAGE_DESIGN placeholders |
| No effects/animations | Add them in theme.css based on PAGE_DESIGN.md |
| Components look too basic | Style component classes in theme.css |
| TypeScript errors | Run `pnpm generate:types` |

---

## File Locations

| Purpose | Path |
|---------|------|
| **Theme (ALL visual styling)** | `src/app/(frontend)/theme.css` |
| Base structure (don't modify) | `src/app/(frontend)/globals.css` |
| SEO title | `src/plugins/index.ts` |
| Seed data | `src/endpoints/seed/index.ts` |
| Block components | `src/blocks/*/Component.tsx` |
