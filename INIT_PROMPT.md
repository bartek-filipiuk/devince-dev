# INIT_PROMPT.md - Site Customization Orchestrator

## Overview

This is a **staged HANDOFF document** that orchestrates the complete site customization process. The agent runs autonomously through all stages, with quality reviews after each coding stage.

**Prerequisites:**
- `PAGE_DESCRIPTION.md` - Business information (must be filled)
- `PAGE_DESIGN.md` - Visual design specifications (must be filled)

**Output:**
- Fully customized Payload CMS website matching the design specs
- Theme, seed data, navigation, and configuration all generated

---

## Execution Instructions

Run this entire document as a single prompt. The agent will:
1. Execute each stage sequentially
2. Run code quality reviews after each coding stage
3. Log checkpoints for progress tracking
4. Fail fast if prerequisites are missing

---

## Stage 0: Pre-Flight Checks

### Tasks

1. **Verify Docker is running:**
   ```bash
   docker compose ps
   ```
   - If PostgreSQL container is not running, start it: `docker compose up -d`
   - Wait for container to be healthy before proceeding

2. **Verify dependencies installed:**
   ```bash
   pnpm install
   ```
   - Run install to ensure all packages are available

3. **Verify PAGE_DESCRIPTION.md exists and is filled:**
   - Read `PAGE_DESCRIPTION.md`
   - Check that business name, type, and key sections are filled (not placeholder text)
   - **ABORT if:** File missing or contains only template placeholders

4. **Verify PAGE_DESIGN.md exists and is filled:**
   - Read `PAGE_DESIGN.md`
   - Check that color descriptions, typography, and visual style are specified
   - **ABORT if:** File missing or contains only template placeholders

5. **Verify environment:**
   - Check `.env` file exists (copy from `.env.example` if missing)
   - Ensure `DATABASE_URI` is configured for port 5433

### Gate

**ABORT execution if any prerequisite is missing.** Report what's missing and exit.

### Checkpoint

```
[CHECKPOINT] Stage 0 Complete: Pre-Flight Checks Passed
- Docker: Running
- Dependencies: Installed
- PAGE_DESCRIPTION.md: Verified
- PAGE_DESIGN.md: Verified
- Environment: Configured
```

---

## Stage 1: Theme Generation (CRITICAL)

This is the most important stage. The boilerplate provides STRUCTURE ONLY - you create ALL visual identity.

### Tasks

1. **Read PAGE_DESIGN.md thoroughly:**
   - Understand color philosophy and associations
   - Note all visual effects (glass, gradients, glows, textures)
   - Note all animations (hover effects, scroll reveals, transitions)
   - Understand typography preferences
   - Document component-specific styling requirements

2. **Generate `src/app/(frontend)/theme.css`:**

   **Section 1: Color Palette**
   - Interpret creative color descriptions into HSL values
   - Create both light mode (`:root`) and dark mode (`[data-theme='dark']`) variants
   - Map all CSS variables: `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, etc.

   **Section 2: Custom Effects**
   - Create glass morphism effects if design specifies "glass" or "frosted"
   - Create gradient effects if design specifies gradients
   - Create glow/shadow effects if design specifies glows
   - Create texture overlays if design specifies patterns

   **Section 3: Custom Animations**
   - Create @keyframes for any specified animations
   - Add transition effects for interactive elements
   - Implement hover states for buttons and cards

   **Section 4: Component Styles**
   - Style ALL semantic CSS classes to match design vision:
     - Hero: `.hero-section`, `.hero-background`, `.hero-headline`, `.hero-cta-primary`, etc.
     - Features: `.feature-card`, `.feature-icon`, `.feature-title`, etc.
     - Testimonials: `.testimonial-card`, `.testimonial-quote`, `.testimonial-star`, etc.
     - Contact: `.contact-section`, `.contact-cta`, `.contact-link`, etc.

   **Section 5: Typography**
   - Font family customizations if specified
   - Font weight and size adjustments
   - Letter spacing and line height

   **Section 6: Responsive**
   - Mobile-first breakpoint adjustments
   - Ensure readability at all screen sizes

3. **Verify theme completeness:**
   - NO `INTERPRET_FROM_PAGE_DESIGN` placeholders remain
   - All specified effects are implemented
   - All specified animations are implemented
   - Both light and dark modes have appropriate values

### Post-Stage Review

1. **code-simplifier**: Clean and refine the generated theme.css
   - Focus: `src/app/(frontend)/theme.css`
   - Goal: Clarity, consistency, maintainability, no redundant rules

2. **pr-review-toolkit:code-reviewer**: Review against project guidelines
   - Focus: Unstaged changes from this stage
   - Goal: CSS best practices, proper HSL format, semantic class usage

### Checkpoint

```
[CHECKPOINT] Stage 1 Complete: Theme Generated
- Colors: Light and dark mode HSL values defined
- Effects: [List created effects]
- Animations: [List created animations]
- Components: All semantic classes styled
```

---

## Stage 2: Site Configuration

### Tasks

1. **Update `src/plugins/index.ts`:**
   - Replace `SITE_NAME` constant with business name from PAGE_DESCRIPTION.md
   - Example: `const SITE_NAME = 'Business Name'`

2. **Update `.env`:**
   - Set `NEXT_PUBLIC_SITE_NAME` to match business name

3. **Configure SiteSettings global concept:**
   - Note: Actual SiteSettings data is populated via seed, but prepare the values:
     - `siteName`: Business name
     - `contact.email`: Contact email from PAGE_DESCRIPTION.md
     - `contact.phone`: Contact phone from PAGE_DESCRIPTION.md
     - `contact.address`: Address fields from PAGE_DESCRIPTION.md
     - `socialLinks`: Social media URLs from PAGE_DESCRIPTION.md

### Post-Stage Review

1. **code-simplifier**: Clean any configuration changes
   - Focus: Modified config files
   - Goal: Clean, consistent formatting

2. **pr-review-toolkit:code-reviewer**: Review configuration
   - Focus: Unstaged changes
   - Goal: No hardcoded secrets, proper env var usage

### Checkpoint

```
[CHECKPOINT] Stage 2 Complete: Site Configured
- SITE_NAME: Updated in plugins/index.ts
- ENV: NEXT_PUBLIC_SITE_NAME set
- SiteSettings: Values prepared for seed
```

---

## Stage 3: Seed Data Creation

### Tasks

1. **Read PAGE_DESCRIPTION.md for content requirements:**
   - Business value propositions
   - Target audience messaging
   - Feature/service descriptions
   - Testimonial themes
   - CTA messaging

2. **Generate `src/endpoints/seed/index.ts`:**

   **Create Homepage with blocks:**
   - `glassHero`: Compelling headline and subheadline matching business type
   - `features`: 3-6 features based on PAGE_DESCRIPTION.md value props
   - `testimonials`: 2-4 testimonials with realistic names and quotes
   - `contactCTA`: Contact section with business info

   **Use the `createRichText` helper for all rich text fields:**
   ```typescript
   subheadline: createRichText('Your compelling subheadline text'),
   ```

   **Set proper link references:**
   ```typescript
   primaryCTA: {
     type: 'custom',
     url: '#contact',
     label: 'Get Started',
     appearance: 'default',
   },
   ```

   **Populate SiteSettings global:**
   ```typescript
   await payload.updateGlobal({
     slug: 'site-settings',
     data: {
       siteName: 'Business Name',
       contact: {
         email: 'contact@business.com',
         phone: '+48 123 456 789',
         address: { street: '...', city: '...', postalCode: '...', country: '...' },
       },
       socialLinks: [
         { platform: 'facebook', url: 'https://...' },
         { platform: 'instagram', url: 'https://...' },
       ],
     },
   })
   ```

3. **Ensure content quality:**
   - Headlines are compelling and specific to business
   - Feature descriptions highlight real benefits
   - Testimonials feel authentic (varied roles, specific praise)
   - CTAs have clear action-oriented labels

### Post-Stage Review

1. **code-simplifier**: Clean seed data code
   - Focus: `src/endpoints/seed/index.ts`
   - Goal: Clean structure, proper TypeScript types, no redundancy

2. **pr-review-toolkit:code-reviewer**: Review seed data
   - Focus: Unstaged changes
   - Goal: Proper Payload API usage, no TypeScript errors

### Checkpoint

```
[CHECKPOINT] Stage 3 Complete: Seed Data Created
- Homepage: Created with [X] blocks
- Features: [X] features defined
- Testimonials: [X] testimonials defined
- SiteSettings: Contact and social links populated
```

---

## Stage 4: Navigation Setup

### Tasks

1. **Update Header navigation in seed:**
   ```typescript
   await payload.updateGlobal({
     slug: 'header',
     data: {
       navItems: [
         {
           link: {
             type: 'custom',
             url: '/',
             label: 'Home',
           },
         },
         {
           link: {
             type: 'custom',
             url: '#features',
             label: 'Features',
           },
         },
         // Add items based on PAGE_DESCRIPTION.md sections
       ],
     },
   })
   ```

2. **Update Footer navigation in seed:**
   - Mirror main navigation items
   - Add secondary links (Privacy Policy, Terms, etc.) if needed
   - Footer automatically pulls social links from SiteSettings

3. **Configure display options:**
   ```typescript
   await payload.updateGlobal({
     slug: 'footer',
     data: {
       navItems: [...],
       showSocialLinks: true,
       showContactInfo: true,
       showNewsletter: false, // Enable if business wants newsletter
     },
   })
   ```

### Post-Stage Review

1. **code-simplifier**: Clean navigation code
   - Focus: Navigation-related seed code
   - Goal: Consistent link structure, no duplicate items

2. **pr-review-toolkit:code-reviewer**: Review navigation
   - Focus: Unstaged changes
   - Goal: Proper link field usage, accessibility considerations

### Checkpoint

```
[CHECKPOINT] Stage 4 Complete: Navigation Ready
- Header: [X] nav items configured
- Footer: Navigation and display options set
- Social Links: Connected to SiteSettings
```

---

## Stage 5: CMS Extensions (Conditional)

**Skip this stage if PAGE_DESCRIPTION.md doesn't require additional content types.**

### Conditions to Check

Review PAGE_DESCRIPTION.md for mentions of:
- Blog/Articles
- Projects/Portfolio
- Team members
- Products/Services catalog
- Events
- FAQ

### Tasks (If Extensions Needed)

1. **Create new collections:**
   - Follow pattern in `src/collections/`
   - Add to `collections` array in `src/payload.config.ts`

2. **Create new blocks if needed:**
   - Create `src/blocks/[BlockName]/config.ts`
   - Create `src/blocks/[BlockName]/Component.tsx`
   - Add semantic CSS classes for theme.css styling
   - Register in `src/blocks/RenderBlocks.tsx`
   - Add to Pages collection blocks array

3. **Generate types:**
   ```bash
   pnpm generate:types
   ```

### Post-Stage Review

1. **code-simplifier**: Clean new collection/block code
   - Focus: Newly created files
   - Goal: Consistent with existing patterns, proper TypeScript

2. **pr-review-toolkit:code-reviewer**: Review extensions
   - Focus: Unstaged changes
   - Goal: Proper Payload patterns, no security issues

### Checkpoint

```
[CHECKPOINT] Stage 5 Complete: CMS Extended
- Collections: [List new collections or "None needed"]
- Blocks: [List new blocks or "None needed"]
- Types: Generated
```

---

## Stage 6: Image Sourcing (Conditional)

**Skip this stage if PAGE_DESIGN.md doesn't specify hero images or custom backgrounds.**

### Conditions to Check

Review PAGE_DESIGN.md for mentions of:
- Hero background images
- Team photos
- Feature illustrations
- Texture/pattern backgrounds

### Tasks (If Images Needed)

1. **Search for appropriate images:**
   - Use Unsplash or Pexels for royalty-free images
   - Match style described in PAGE_DESIGN.md
   - Download high-resolution versions

2. **Add images to project:**
   - Save to `public/images/` directory
   - Use descriptive filenames (e.g., `hero-bg.jpg`, `team-ceo.jpg`)
   - Optimize images (compress, consider WebP format)

3. **Ensure text readability:**
   - For any image with text overlay, add dark overlay in theme.css:
   ```css
   .hero-background {
     background:
       linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)),
       url('/images/hero-bg.jpg') center/cover;
   }
   ```
   - Minimum overlay opacity: 50% for WCAG compliance

4. **Update theme.css with image references:**
   - Add background-image declarations
   - Ensure proper sizing and positioning

### Checkpoint

```
[CHECKPOINT] Stage 6 Complete: Images Ready
- Images sourced: [List images or "None needed"]
- Overlays: Applied for text readability
- Theme updated: Image references added
```

---

## Stage 7: Final Verification

### Tasks

1. **Re-read PAGE_DESIGN.md completely**

2. **Run design verification checklist:**

   **Colors:**
   - [ ] Primary color matches design description
   - [ ] Secondary color matches design description
   - [ ] Accent colors implemented
   - [ ] Dark mode variants work correctly

   **Effects:**
   - [ ] Glass morphism (if specified)
   - [ ] Gradients (if specified)
   - [ ] Glows/shadows (if specified)
   - [ ] Textures/patterns (if specified)

   **Animations:**
   - [ ] Hover effects on buttons
   - [ ] Hover effects on cards
   - [ ] Scroll animations (if specified)
   - [ ] Transitions on interactive elements

   **Typography:**
   - [ ] Font family matches design
   - [ ] Font sizes appropriate (min 16px body, min 32px H1)
   - [ ] Letter spacing and line height set

   **Components:**
   - [ ] Hero styling matches design vision
   - [ ] Feature cards match design
   - [ ] Testimonials match design
   - [ ] Contact section matches design

   **Accessibility (WCAG AA):**
   - [ ] Contrast ratio 4.5:1 for body text
   - [ ] Contrast ratio 3:1 for large text
   - [ ] Focus states visible
   - [ ] Text over images has adequate overlay

3. **Fix any discrepancies found:**
   - Update theme.css for any missing styles
   - Add missing animations or effects
   - Adjust colors for better contrast if needed

### Post-Stage Review

**pr-review-toolkit:code-reviewer**: Comprehensive final review
- Focus: All changes made during customization
- Goal: Full compliance with project guidelines, accessibility, best practices

### Checkpoint

```
[CHECKPOINT] Stage 7 Complete: Verification Passed
- Design match: All elements verified
- Accessibility: WCAG AA compliant
- Effects: All specified effects implemented
- Animations: All specified animations implemented
```

---

## Stage 8: Build & Test

### Tasks

1. **Generate TypeScript types:**
   ```bash
   pnpm generate:types
   ```
   - Fix any type errors that appear

2. **Run production build:**
   ```bash
   pnpm build
   ```
   - Fix any build errors
   - Address any TypeScript compilation issues

3. **Start development server:**
   ```bash
   pnpm dev
   ```

4. **Verify site renders:**
   - Check homepage loads without errors
   - Verify all blocks render correctly
   - Test dark mode toggle (if implemented)
   - Check responsive behavior at mobile breakpoints

5. **Run seed (if needed):**
   - Navigate to `/api/seed` or use admin panel
   - Verify content populates correctly

### Final Checkpoint

```
[CHECKPOINT] Stage 8 Complete: Build & Test Passed
- Types: Generated successfully
- Build: Completed without errors
- Dev server: Running at localhost:3000
- Site renders: Verified

========================================
HANDOFF COMPLETE - Site Ready
========================================

Summary:
- Theme: Custom visual identity generated
- Content: Seed data with compelling copy
- Navigation: Header and footer configured
- Configuration: Site settings populated
- Extensions: [List or "None"]
- Build: Passing

Next steps for deployment:
1. Review generated content in admin panel
2. Replace placeholder images with actual assets
3. Update testimonials with real customer feedback
4. Configure production environment variables
5. Deploy to hosting platform
```

---

## Error Recovery

### If Stage Fails

1. **Read the error message carefully**
2. **Fix the specific issue**
3. **Re-run the failed stage tasks**
4. **Continue from where you left off**

### Common Issues

| Error | Solution |
|-------|----------|
| Docker not running | `docker compose up -d` |
| TypeScript errors | `pnpm generate:types` then fix imports |
| Build fails | Check console for specific error, fix, rebuild |
| Missing dependencies | `pnpm install` |
| Database connection | Verify `.env` has port 5433 |

---

## Agent Review Pattern Reference

After each coding stage, run these agents in sequence:

### 1. code-simplifier

```
Focus: Recently modified files from this stage
Goal: Simplify and refine code for clarity, consistency, and maintainability
Actions:
- Remove redundant code
- Improve naming
- Ensure consistent formatting
- Preserve all functionality
```

### 2. pr-review-toolkit:code-reviewer

```
Focus: Unstaged git changes (run `git diff` to see scope)
Goal: Review against project guidelines and best practices
Actions:
- Check style compliance
- Verify TypeScript correctness
- Ensure no security issues
- Validate accessibility considerations
```

---

## Quick Reference

### Files Modified

| Stage | Files |
|-------|-------|
| 1 | `src/app/(frontend)/theme.css` |
| 2 | `src/plugins/index.ts`, `.env` |
| 3 | `src/endpoints/seed/index.ts` |
| 4 | `src/endpoints/seed/index.ts` (nav sections) |
| 5 | `src/collections/*`, `src/blocks/*` (conditional) |
| 6 | `public/images/*`, `theme.css` (conditional) |
| 7 | Various (fixes) |
| 8 | None (verification only) |

### Key Commands

```bash
docker compose up -d      # Start database
pnpm install              # Install dependencies
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm generate:types       # Regenerate types
```

### Documentation Reference

| Need | File |
|------|------|
| Block schemas | `PAGE_BOILERPLATE.md` |
| CSS classes | `CLAUDE.md` → Semantic CSS Classes |
| Troubleshooting | `PAGE_DEVTIPS.md` |
| Example themes | `SETUP_PROMPT.md` → Design Theme Examples |
