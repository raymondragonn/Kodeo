# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kodeo Website** is a React + Vite landing page for a digital agency (Kodeo, Mexico). It showcases services, portfolio projects, testimonials, and business metrics. The site supports both Spanish and English via a language toggle component.

Key features:
- Multi-section landing page (Hero, Services, Projects, Testimonials, Stats, CTA)
- Dual-language support (Spanish/English) with centralized copy in `src/data/copy.js`
- Smooth animations using GSAP (GreenSock Animation Platform)
- Page-based navigation via React state (landing page vs. individual service pages)
- Responsive design with CSS custom properties for theming

## Development Commands

### Core Commands

```bash
npm run dev           # Start development server with HMR (http://localhost:5000)
npm run dev:clean     # Clean Vite cache and restart dev server (if slow)
npm run build         # Build for production (output in ./dist)
npm run build:analyze # Build with debug info for analyzing performance
npm run lint          # Run ESLint on all .js/.jsx files
npm run preview       # Preview production build locally (http://localhost:5000)
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Edit components** in `src/components/` — changes auto-reload
3. **Update copy/content**: Edit `src/data/copy.js` (controls all visible text)
4. **Run lint before committing**: `npm run lint`

### If Dev Server is Slow

Run `npm run dev:clean` to clear Vite's cache and rebuild dependency metadata.

## Code Architecture

### Directory Structure

```
src/
├── components/       # React components (one per feature)
├── data/            # Content & configuration (copy.js is the central copy)
├── hooks/           # Custom React hooks (e.g., useMagneticCursor)
├── styles/          # Global CSS (globals.css contains CSS custom properties)
├── assets/          # Images, project assets organized by category
│   └── projects/    # Project portfolio images grouped by project
└── main.jsx         # React entry point
```

### Component Architecture

The app uses **state-based routing** instead of a router library:
- `page` state determines current view: `'landing'` or `'svc-01'`/`'svc-02'`/`'svc-03'` (service detail pages)
- `lang` state controls language: `'es'` or `'en'`
- `motionSpeed` state controls animation pacing across all components

**App.jsx flow:**
1. Renders `LangToggle` (top-right language switcher)
2. If `page === 'landing'`: renders full landing page with all sections
3. Otherwise: renders `ServicePage` component for individual service details

### Key Components

| Component | Purpose |
|-----------|---------|
| `Nav` | Header navigation with logo, links, contact button |
| `Hero` | Main hero section with headline and CTA |
| `Marquee` | Animated scrolling text banner |
| `Services` | Service tiers grid (3 offerings with pricing) |
| `Projects` | Portfolio showcase with modal preview |
| `ProjectModal` | Modal overlay for selected project details |
| `Testimonials` | Customer quotes carousel |
| `Stats` | Key metrics display (4.9★, 98%, etc.) |
| `CtaSection` | Call-to-action closing section |
| `Footer` | Footer with links and branding |
| `ServicePage` | Detail page for individual services |
| `LangToggle` | Language switcher (ES/EN) |

### Content Management

**All visible text is centralized in `src/data/copy.js`:**
- Contains a `COPY` object with `es` and `en` keys
- Each language variant includes: nav labels, hero text, service descriptions, project details, testimonials, stats, CTA copy, etc.
- Components receive `copy` prop and access nested properties: `copy.services.list`, `copy.projects.items`, etc.

To update content: **Always edit `copy.js`**, not hardcoded text in components.

## Styling & Animation

### Styles

- Global CSS in `src/styles/globals.css` defines CSS custom properties (e.g., `--bg`, `--text`, etc.)
- Each component has inline styles or scoped CSS modules (check individual component files)
- Color scheme and spacing controlled via CSS variables

### Animation

- **GSAP** (GreenSock) is the animation library for smooth, performant transitions
- `motionSpeed` prop (default 0.8) controls animation duration across components
- Check components like `Hero`, `Marquee`, `Services` for GSAP usage patterns

### Custom Hooks

- **`useMagneticCursor`** (`src/hooks/useMagneticCursor.js`): Implements a cursor that "follows" or "magnetizes" to interactive elements
  - Used for enhanced interactivity on hover

## Language & Content Updates

1. **To add/change text:** Edit `src/data/copy.js`
2. **To add a new language:** Add a new key (e.g., `fr`) to `COPY` object with all required nested properties
3. **Component receives copy:** Components get `copy` prop from `App.jsx` based on current `lang` state
4. **Language toggle:** `LangToggle` component updates `lang` state, triggering re-render with new copy

## Page Navigation

**Landing Page Flow:**
- Default view shows full landing with all sections
- User clicks on a service → `handleServiceClick()` sets `page` to `'svc-01'` (etc.) and scrolls to top
- `ServicePage` component displays detail view
- "Back" button in `ServicePage` calls `handleBack()` to reset `page` to `'landing'`

**Smooth Scrolling:**
- Navigation items scroll to section IDs: `document.getElementById(id).scrollIntoView({ behavior: 'smooth' })`
- Section IDs map: `NAV_SECTION_MAP` in `App.jsx` (e.g., "Servicios" → "services")

## ESLint & Code Quality

- ESLint config in `eslint.config.js` includes:
  - React Hooks rules (`eslint-plugin-react-hooks`)
  - React Refresh rules for HMR (`eslint-plugin-react-refresh`)
  - Browser globals enabled
- Run `npm run lint` before committing
- No TypeScript currently (JSX only)

## Building & Deployment

- `npm run build` outputs to `./dist/` (production-ready static files)
- Vite handles minification, code splitting, and asset optimization
- `index.html` is the entry point; `src/main.jsx` loads React app

## Performance & Compilation Optimizations

**Node.js Version:** v22.22.2 (leverages modern JavaScript features for faster builds)

**Vite Optimizations Applied:**
- **Port 5000** for faster startup and less conflicts
- **ESBuild** for ultra-fast minification (10-100x faster than Terser)
- **Dependency pre-bundling** for React, React-DOM, and GSAP
- **Tree-shaking** to remove dead code from production builds
- **Code splitting** for GSAP as a separate chunk to improve caching
- **Console/debugger cleanup** in production builds

**To accelerate dev server if it slows down:**
- Run `npm run dev:clean` to clear Vite's dependency cache
- Restart the dev server
- Vite's dependency pre-bundling only happens once per installation

**Build analysis:**
- Use `npm run build:analyze` if you need to debug build performance

## Common Development Tasks

### Adding a new component

1. Create `src/components/MyComponent.jsx`
2. Import in `App.jsx` if needed
3. Pass `copy` and `motionSpeed` props for consistency
4. Use GSAP for animations (or CSS if simple)

### Updating service offerings

1. Edit `copy.es.services.list` and `copy.en.services.list` in `src/data/copy.js`
2. Services auto-render in `Services` component via `.map()`

### Adding a project to portfolio

1. Add image(s) to `src/assets/projects/{project-name}/`
2. Add project object to `copy.es.projects.items` and `copy.en.projects.items`
3. `Projects` component auto-renders with correct path and metadata

## Notes for Future Work

- The app uses state-based routing; consider adding React Router if the site expands beyond landing + 3 service pages
- GSAP animations are performance-friendly but watch for layout shifts on slow devices
- CSS custom properties make theme changes easy (see `globals.css`)
- All copy is client-side; to make content dynamic, integrate a CMS or API
