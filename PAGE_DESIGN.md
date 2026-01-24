# Visual Specification - Devins Hub Page

> **Devins** - Dev Agency/Consulting hub page with a sharp, professional, tech-forward aesthetic.

---

## DESIGN CONCEPT

### Overall Theme
| Attribute | Description |
|-----------|-------------|
| **Concept Name** | Precision Tech |
| **Mood** | Professional, Modern, Innovative, Forward-thinking |
| **Industry Vibe** | Dev Agency, Technical Consulting, Software Development |

### Inspiration
> Sharp geometric aesthetic with clean minimal design. Technical sophistication meets accessibility.

```
INSPIRATION:
- Anthropic.com - Warm, approachable tech with sophisticated color philosophy
- Linear.app - Sharp corners, developer-focused, precise geometry
- Vercel.com - Clean gradients, monospace typography, dark mode excellence
- Stripe.com - Professional polish, subtle shadows, clear hierarchy
```

---

## COLOR PALETTE

### Primary Color - Indigo Blue
```
CONCEPT: Deep indigo blue representing innovation, trust, and technical expertise

ASSOCIATIONS:
- Innovation and forward-thinking technology
- Trust and reliability in professional services
- Technical depth and expertise
- Clear communication and transparency

USAGE:
- Primary buttons and CTAs
- Links and interactive elements
- Section accents and highlights
- Icon colors and feature highlights

INTENSITY: Deep / Professional

HSL VALUES:
- Light mode: 220 70% 50% (#4059D6)
- Dark mode: 220 65% 60% (#5B7AE5 - brighter for visibility)
```

### Secondary Color - Cool Slate Gray
```
CONCEPT: Sophisticated neutral that supports without competing

ASSOCIATIONS:
- Professionalism and reliability
- Technical precision
- Modern minimalism
- Balance and stability

USAGE:
- Text colors
- Borders and dividers
- Muted backgrounds
- Supporting UI elements

INTENSITY: Muted / Sophisticated

HSL VALUES:
- Light mode: 210 15% 45%
- Dark mode: 210 15% 65%
```

### Accent Color - Electric Blue
```
CONCEPT: Bright highlight for emphasis and interactivity

USAGE:
- Focus states
- Hover highlights
- Important notifications
- Active states

INTENSITY: Bright

HSL VALUES:
- Light mode: 215 85% 55%
- Dark mode: 215 80% 65%
```

### Background Colors
```
LIGHT MODE:
- Main background: 210 15% 96% - Cool light gray with subtle blue undertone
- Card background: 210 15% 98% - Slightly lighter for elevation
- Section alternates: 210 12% 94% - Subtle differentiation

DARK MODE:
- Main background: 220 20% 10% - Deep blue-gray, not pure black
- Card background: 220 18% 14% - Elevated surfaces
- Section alternates: 220 22% 8% - Deeper sections
```

### Semantic Colors
```
SUCCESS: 142 70% 45% - Green with slight blue undertone
WARNING: 38 92% 50% - Warm amber
ERROR: 0 72% 51% - Clear red
INFO: 210 80% 52% - Matches primary family
```

### Complete HSL Color System
```css
/* LIGHT MODE */
--background: 210 15% 96%;
--foreground: 210 20% 15%;
--card: 210 15% 98%;
--card-foreground: 210 20% 15%;
--popover: 210 15% 98%;
--popover-foreground: 210 20% 15%;
--primary: 220 70% 50%;
--primary-foreground: 0 0% 100%;
--secondary: 210 12% 90%;
--secondary-foreground: 210 20% 25%;
--muted: 210 15% 92%;
--muted-foreground: 210 12% 45%;
--accent: 215 85% 55%;
--accent-foreground: 0 0% 100%;
--destructive: 0 72% 51%;
--destructive-foreground: 0 0% 100%;
--border: 210 15% 88%;
--input: 210 15% 88%;
--ring: 220 70% 50%;

/* DARK MODE */
--background: 220 20% 10%;
--foreground: 210 15% 95%;
--card: 220 18% 14%;
--card-foreground: 210 15% 95%;
--popover: 220 18% 14%;
--popover-foreground: 210 15% 95%;
--primary: 220 65% 60%;
--primary-foreground: 220 20% 10%;
--secondary: 220 15% 20%;
--secondary-foreground: 210 15% 85%;
--muted: 220 15% 18%;
--muted-foreground: 210 12% 60%;
--accent: 215 80% 65%;
--accent-foreground: 220 20% 10%;
--destructive: 0 62% 55%;
--destructive-foreground: 0 0% 100%;
--border: 220 15% 22%;
--input: 220 15% 22%;
--ring: 220 65% 60%;
```

---

## TYPOGRAPHY

### Font Choices
```
HEADLINES:
- Font: JetBrains Mono
- Style: Technical, precise, developer-focused
- Weight: Bold (700) for H1, SemiBold (600) for H2-H3
- Character: Monospace personality conveys technical expertise

BODY TEXT:
- Font: IBM Plex Sans
- Style: Highly readable, professional, modern
- Weight: Regular (400) for body, Medium (500) for emphasis
- Character: Clean tech aesthetic, excellent readability

SPECIAL ELEMENTS:
- Code snippets: JetBrains Mono Regular
- Labels/Tags: IBM Plex Sans Medium, uppercase, tracked
- Numbers: JetBrains Mono for technical precision
```

### Text Hierarchy
```
H1: JetBrains Mono Bold, 48-64px, tracking -0.02em, cool gray dark
H2: JetBrains Mono SemiBold, 32-40px, tracking -0.01em
H3: JetBrains Mono Medium, 24-28px
Body: IBM Plex Sans Regular, 16-18px, line-height 1.6
Small: IBM Plex Sans Regular, 14px, muted foreground color
Caption: IBM Plex Sans Medium, 12px, uppercase, letter-spacing 0.05em
```

### Font Import
```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&display=swap');
```

---

## VISUAL EFFECTS

### Background Effects
```
WANT: Yes
TYPE: Subtle gradient
DESCRIPTION: Very subtle gradient from cool gray to slightly cooler gray.
             Creates depth without distraction. Hero has more pronounced
             gradient transitioning from slightly warmer gray at top to
             cooler tone at bottom.

HERO GRADIENT: linear-gradient(180deg, hsl(210 15% 97%) 0%, hsl(210 18% 94%) 100%)
DARK HERO: linear-gradient(180deg, hsl(220 20% 12%) 0%, hsl(220 22% 8%) 100%)
```

### Card/Element Effects
```
WANT: Yes
TYPE: Subtle shadow
DESCRIPTION: Soft drop shadows for depth and elevation. No borders on cards,
             relying on shadow and background color differentiation.
             Sharp 0px border-radius throughout for geometric aesthetic.

SHADOW LEVELS:
- sm: 0 1px 2px 0 rgb(0 0 0 / 0.03)
- base: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)
- md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)
- lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)

BORDER RADIUS: 0px (sharp corners everywhere)
```

### Hover Effects
```
WANT: Yes
TYPE: Lift effect with enhanced shadow
DESCRIPTION: Cards lift slightly on hover with shadow enhancement.
             Buttons have subtle background shift. Links have underline
             animation. Smooth 200ms transitions.

CARD HOVER:
- Transform: translateY(-2px)
- Shadow: Increase to lg level
- Transition: all 200ms ease-out

BUTTON HOVER:
- Background: Slightly darker/lighter
- Transform: none (static, professional)

LINK HOVER:
- Underline slides in from left
- Color: primary color
```

### Animations
```
WANT: Yes
TYPE: Fade-in with stagger
DESCRIPTION: Elements fade in and slide up slightly as they enter viewport.
             Staggered timing creates sequential reveal effect.
             Subtle, professional - not distracting.

INTENSITY: Subtle

FADE IN:
- Opacity: 0 to 1
- Transform: translateY(20px) to translateY(0)
- Duration: 600ms
- Easing: cubic-bezier(0.25, 0.1, 0.25, 1)

STAGGER:
- Delay between items: 100ms
- Max items to stagger: 6

TRIGGER: On scroll into viewport (IntersectionObserver)
```

### Decorative Elements
```
WANT: No
ELEMENTS: None
DESCRIPTION: Clean, uncluttered design. Let content and typography speak.
             No decorative patterns, shapes, or icons as decoration.
```

---

## COMPONENT STYLING

### Hero Section
```
LAYOUT: Full viewport (100vh)
BACKGROUND: Subtle gradient (cool gray spectrum)
HEADLINE STYLE: Extra large (64px+), JetBrains Mono Bold, centered
SUBHEADLINE: IBM Plex Sans, larger body size, muted foreground
CTA BUTTONS: Primary indigo button, sharp corners, subtle shadow

STRUCTURE:
- Vertically and horizontally centered content
- Business name: Large, bold, primary color
- Tagline: "Turning ideas into reality" - muted, elegant
- CTA: Primary button or scroll indicator

SPACING:
- Generous whitespace
- Content max-width: 800px
- Padding: 2rem on mobile, 4rem on desktop
```

### About/Mission Section
```
LAYOUT: Centered content block
BACKGROUND: Alternate section color (slightly different gray)
CONTENT: Rich text about company values and approach
TYPOGRAPHY: Body text optimized for reading
MAX-WIDTH: 680px for comfortable reading line length

STYLING:
- Generous padding (6rem vertical)
- Clear heading hierarchy
- Subtle separator line if needed
```

### Contact CTA Section
```
LAYOUT: Full width, centered content
BACKGROUND: Primary indigo color
TEXT: White/light foreground for contrast
EMPHASIS: All contact methods equal prominence

CONTENT:
- Clear headline inviting contact
- Email, phone, location info
- Social links if applicable
- Optional secondary CTA button (outline style on dark)

STYLING:
- High contrast white on indigo
- Sharp corners on any buttons
- Icons in white/light color
```

### Navigation
```
STYLE: Transparent initially, solid on scroll
POSITION: Sticky top
BACKGROUND: Transparent, transitions to background color on scroll
CTA BUTTON: No - keep navigation minimal

ELEMENTS:
- Logo/Business name on left
- Nav links center or right
- Dark mode toggle
- Mobile: Hamburger menu

BEHAVIOR:
- Blur backdrop when scrolled
- Subtle shadow when stuck
```

### Footer
```
STYLE: Dark (dark mode colors even in light mode)
COLUMNS: Single column, minimal
SOCIAL ICONS: Yes, if specified in contact info
CONTENT: Copyright, minimal links

STYLING:
- Matches dark mode palette
- Sharp, minimal aesthetic
- Subtle border-top for separation
```

---

## PLACEHOLDER IMAGES

### Hero Image
```
TYPE: None - gradient background only
DESCRIPTION: No hero image needed. Clean gradient creates sufficient visual interest.
MOOD: N/A
```

### Section Images
```
IMAGE 1: N/A - content-focused sections
IMAGE 2: N/A
IMAGE 3: N/A

Note: This hub page is text/content focused. Add images only if
PAGE_DESCRIPTION.md specifies specific imagery needs.
```

### Team/About Images
```
TYPE: N/A for initial hub page
STYLE: N/A

Note: Add team photos only when team section is requested.
```

---

## RESPONSIVE DESIGN

### Mobile Priorities
```
1. Business name and tagline (hero content)
2. Contact information accessibility
3. Clear navigation and dark mode toggle
```

### Animation Behavior
```
MOBILE: Reduce - simpler fade only, no transform, shorter duration
TABLET: Keep all - full animation experience
DESKTOP: Keep all - full animation experience
```

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

---

## ACCESSIBILITY

### Requirements
```
CONTRAST: Standard AA (4.5:1 for body text, 3:1 for large text)
FOCUS INDICATORS: Primary color ring, 2px offset, visible on all elements
REDUCED MOTION: Honor system preference - disable transforms, reduce durations
KEYBOARD: Full keyboard navigation support
SCREEN READERS: Semantic HTML, proper heading hierarchy, ARIA where needed
```

### Focus Style
```css
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

---

## DARK MODE

### Implementation
```
TOGGLE: Yes - visible toggle in navigation
DEFAULT: System preference on first visit
PERSISTENCE: Save preference to localStorage
TRANSITION: Smooth color transition (200ms)
```

### Color Adjustments
```
- Primary color brightens for visibility
- Backgrounds use deep blue-gray, not pure black
- Shadows become more subtle (lower opacity)
- Borders become more visible
- Text contrast inverts appropriately
```

---

## WOW FACTORS

1. **Technical Typography Personality**
   > JetBrains Mono headlines immediately signal developer expertise. The monospace aesthetic feels authentic to the tech industry, not generic corporate.

2. **Sharp Geometric Aesthetic**
   > Zero border-radius throughout creates a distinctive editorial, precise feel. Every element has intentional sharp corners that convey precision and attention to detail.

3. **Staggered Scroll Animations**
   > Content reveals sequentially as users scroll, creating a curated, intentional experience. Each element appears in sequence, guiding attention and adding polish.

4. **Seamless Dark Mode**
   > Full dark mode with smooth transitions. Colors are specifically tuned for dark mode - not just inverted. Deep blue-gray backgrounds feel premium.

5. **Cool Gray Color Philosophy**
   > Subtle blue undertones in the grays create a tech-forward, modern palette. Warmer than pure gray, cooler than corporate beige. Sophisticated and unique.

---

## SUMMARY

| Aspect | Description |
|--------|-------------|
| **Overall Feel** | Sharp, precise, developer-focused design that balances technical credibility with approachable professionalism. Clean geometric aesthetic with intentional restraint. |
| **Key Colors** | Indigo blue primary (#4059D6), cool slate grays, electric blue accents |
| **Typography** | JetBrains Mono for headlines (technical personality), IBM Plex Sans for body (readable professionalism) |
| **Special Effects** | Subtle shadows, staggered fade-in animations, lift hover states |
| **Target Emotion** | Visitors should feel they're dealing with precise, skilled professionals who understand technology and value clarity |
