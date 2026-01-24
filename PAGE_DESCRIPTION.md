# Page Description - Devins Business Hub

> **Devins** - A dev agency and consulting business hub by Bartłomiej Filipiuk.
> This file contains all business information used to generate website content.

---

## BUSINESS DATA

### Basic Information
| Field | Value |
|-------|-------|
| **Business Name** | Devins |
| **Domain** | devince.dev |
| **Tagline** | "Turning ideas into reality" |
| **Owner** | Bartłomiej Filipiuk |
| **Role** | Solo Technical Founder |
| **Year Founded** | 2024 |

### Location
| Field | Value |
|-------|-------|
| **City** | Wrocław |
| **Country** | Poland |
| **Service Area** | Nationwide (Poland) + International (remote) |

### Contact
| Field | Value |
|-------|-------|
| **Email** | contact@devince.dev |
| **Website** | https://devince.dev |
| **Scheduling** | Calendly (link TBD) |

### Social Media
| Platform | Link |
|----------|------|
| **GitHub** | https://github.com/devins (TBD) |
| **LinkedIn** | https://linkedin.com/in/bartlomiej-filipiuk (TBD) |
| **Twitter/X** | https://x.com/devins (TBD) |
| **YouTube** | https://youtube.com/@devins (TBD) |

---

## SERVICES

### Core Service: Web Development
| Service | Description | Typical Engagement |
|---------|-------------|--------------------|
| Full-Stack Applications | Custom web applications built with modern tech stack (React, Next.js, Node.js) | Project-based |
| Website Development | Business websites, landing pages, and marketing sites | Project-based |
| SaaS Development | Building software-as-a-service products from scratch | Long-term partnership |
| Frontend Development | React/Next.js interfaces with focus on UX | Project-based |
| Backend Development | APIs, databases, server infrastructure | Project-based |

### Core Service: Consulting
| Service | Description | Typical Engagement |
|---------|-------------|--------------------|
| Tech Strategy | Technology roadmap planning and decision-making guidance | Advisory |
| Architecture Review | Code and system architecture audits with recommendations | One-time audit |
| Technical Due Diligence | Assessment for investors or acquisitions | One-time |
| CTO-as-a-Service | Part-time technical leadership for startups | Retainer |
| Team Training | Workshops on modern development practices | Sessions |

### Core Service: AI & Automation
| Service | Description | Typical Engagement |
|---------|-------------|--------------------|
| AI Integration | Embedding AI/ML capabilities into existing products | Project-based |
| Workflow Automation | Automating business processes with custom tooling | Project-based |
| AI Strategy | Planning AI adoption and identifying opportunities | Advisory |
| Custom AI Solutions | Building bespoke AI-powered features and tools | Project-based |
| Claude/OpenAI Integration | Implementing LLM-powered features | Project-based |

---

## UNIQUE SELLING POINTS (USP)

### 1. Full-Stack + AI Expertise
> "Deep expertise in both traditional full-stack development and cutting-edge AI integration. Not just implementing AI as a feature, but architecting systems where AI is a first-class citizen."

### 2. Solo Founder Personal Touch
> "Direct communication with the person doing the work. No account managers, no miscommunication. You talk to the developer who writes the code and makes the decisions."

### 3. Community-Driven & Connected
> "Active in the developer community through WrocDevs AI meetups. Connected to the latest trends, tools, and best practices through hands-on community involvement."

### 4. End-to-End Ownership
> "From initial idea through architecture, development, deployment, and maintenance. One person who understands the entire picture and takes full responsibility."

---

## TEAM

### Founder
| | |
|-|-|
| **Name** | Bartłomiej Filipiuk |
| **Role** | Solo Technical Founder |
| **Expertise** | Full-Stack Development, AI Integration, Technical Architecture |
| **Approach** | Hands-on developer who personally delivers all client work |

---

## TARGET AUDIENCE

### Primary Profile: Tech Startups
| Attribute | Description |
|-----------|-------------|
| **Who they are** | Early-stage to growth-stage startups needing technical execution |
| **Company Size** | 1-50 employees |
| **Location** | Poland-based or remote-friendly international |
| **Budget** | Mid-range to premium for quality work |

### Secondary Profile: Established Companies
| Attribute | Description |
|-----------|-------------|
| **Who they are** | Companies wanting AI integration or technical modernization |
| **Company Size** | 10-500 employees |
| **Needs** | AI strategy, automation, tech audits |

### What They're Looking For
- Reliable technical partner who delivers quality work
- AI expertise without enterprise consulting overhead
- Direct communication without layers of management
- Modern tech stack and best practices
- Someone who understands both business and technical sides

### Pain Points (Problems Devins Solves)
- Need AI capabilities but lack in-house expertise
- Frustrated with agency communication and project management overhead
- Previous developers delivered poor architecture or unmaintainable code
- Want a technical co-founder mindset without giving up equity
- Need to move fast but can't afford to accumulate technical debt

---

## CONTENT ARCHITECTURE

### Content Types

| Content Type | Purpose | Routes |
|--------------|---------|--------|
| **Pages** | Homepage with editable blocks, basic info pages | `/`, `/about`, `/founders`, `/initiatives` |
| **Blog** | Industry insights, tech articles, tutorials | `/blog`, `/blog/[slug]` |
| **Projects** | Portfolio showcasing SaaS products and OSS repos | `/projects`, `/projects/[slug]` |
| **Newsletter** | Brevo-powered email signup (component) | Embedded in various sections |

### Site Structure

```
devince.dev/
├── / (Homepage - hero, services, projects, blog preview, CTA)
├── /blog (Blog listing)
│   └── /blog/[slug] (Individual blog posts)
├── /projects (Projects listing with screenshots)
│   └── /projects/[slug] (Full project details)
├── /about (Company info, business philosophy)
├── /founders (Bartłomiej's personal page, story, background)
└── /initiatives (WrocDevs and community involvement)
```

### Homepage Sections (Editable Blocks)
1. **Hero** - Name, tagline, newsletter CTA (Brevo integration)
2. **Services Overview** - Web Dev, Consulting, AI/Automation cards
3. **Featured Projects** - Highlight 2-3 key projects with screenshots
4. **About Preview** - Brief intro with link to full About page
5. **Blog Preview** - Latest 2-3 industry insights
6. **Contact CTA** - Full contact options + newsletter signup

### Projects Content Fields
| Field | Type | Description |
|-------|------|-------------|
| Title | Text | Project name |
| Slug | Text | URL-friendly identifier |
| Short Description | Text | One-liner for listings |
| Screenshot | Media | Primary project image |
| Full Description | Rich Text | Detailed project info |
| Tech Stack | Array | Technologies used |
| GitHub Link | URL | Repository (if OSS) |
| Live URL | URL | Production link (if applicable) |
| Project Type | Select | SaaS / OSS / Client Work |
| Status | Select | Active / Completed / Archived |
| Featured | Boolean | Show on homepage |

### Blog Content Fields
| Field | Type | Description |
|-------|------|-------------|
| Title | Text | Article title |
| Slug | Text | URL-friendly identifier |
| Excerpt | Text | Short summary |
| Content | Rich Text | Full article body |
| Featured Image | Media | Header image |
| Category | Relation | Article category |
| Tags | Array | Topic tags |
| Published Date | Date | Publication date |
| Author | Text | Default: Bartłomiej Filipiuk |

---

## INITIATIVES

### WrocDevs - AI Programmers Community
| | |
|-|-|
| **Name** | WrocDevs |
| **Focus** | AI and programming meetups |
| **Location** | Wrocław, Poland |
| **Purpose** | Building a community of AI-interested developers |
| **Activities** | Regular meetups, talks, networking events |
| **Page Content** | Event info, past talks, community links |

---

## KEYWORDS (SEO)

### Main Phrases
- Dev agency Poland
- Full-stack developer Poland
- AI integration services
- Web development consulting
- Technical consulting Poland

### Service Phrases
- Next.js development
- React developer
- AI automation services
- SaaS development Poland
- CTO as a service

### Local Phrases
- Web developer Wrocław
- Software house Poland
- AI meetup Wrocław
- Tech consulting Poland

---

## COMMUNICATION TONE

### Brand Voice
| Attribute | Description |
|-----------|-------------|
| **Style** | Friendly-personal |
| **Approach** | Expert but approachable, developer-to-developer with warmth |
| **Language** | Polish primary, English available |
| **Tone** | Confident without being arrogant, technical but accessible |

### Writing Guidelines
- Use "I" not "we" - emphasize solo founder authenticity
- Be direct and clear, avoid corporate jargon
- Show expertise through insights, not claims
- Balance technical depth with accessibility
- Conversational but professional

---

## WEBSITE GOALS

### Main Goal
Build an engaged newsletter audience while showcasing technical expertise and generating consulting inquiries.

### Prioritized Goals
| Priority | Goal | Success Metric |
|----------|------|----------------|
| **Primary** | Newsletter signups | Email list growth rate |
| **Secondary** | Project showcase | Portfolio page views, time on page |
| **Tertiary** | Consulting inquiries | Contact form submissions, Calendly bookings |

### Calls-to-Action (CTAs)
| Location | Primary CTA | Secondary CTA |
|----------|-------------|---------------|
| Hero | Subscribe to newsletter | View projects |
| Services | Schedule a call | Learn more |
| Projects | View live demo | See code (GitHub) |
| Blog | Subscribe for more | Share article |
| Contact | Book a consultation | Send message |

### Success Metrics
- Newsletter subscription rate
- Blog article engagement (reads, shares)
- Project page views
- Contact form submissions
- Calendly bookings
- Time on site
- Return visitor rate

---

## NEWSLETTER INTEGRATION

### Brevo Form Component
| Setting | Value |
|---------|-------|
| **Provider** | Brevo (formerly Sendinblue) |
| **Form Type** | Embedded signup |
| **Fields** | Email (required), First Name (optional) |
| **List ID** | Configurable in CMS |
| **Placement** | Hero, Footer, Blog sidebar, Contact page |

### Email Content Strategy
- Industry insights and AI trends
- Project case studies and lessons learned
- Tech tutorials and tips
- WrocDevs event announcements
- Occasional product updates

---

## TECHNICAL NOTES

### Languages
| Language | Usage |
|----------|-------|
| **Polish** | Primary, default |
| **English** | Full translation available |

### Required CMS Features
- Draft/preview functionality for all content
- Media library with image optimization
- SEO fields (meta title, description, OG image)
- Scheduled publishing for blog posts
- Rich text editor with code blocks

### Integration Requirements
- Brevo API for newsletter forms
- Calendly embed for scheduling
- GitHub API for OSS project stats (optional)
- Analytics (Plausible or similar)
