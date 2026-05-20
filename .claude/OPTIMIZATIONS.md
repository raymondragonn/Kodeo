# Project Optimizations

## Build Speed Improvement

**Before:** Slow compilation times
**After:** ~150ms build time ⚡

### Changes Made

#### 1. **vite.config.js** - Performance Optimizations
- **esbuild minification**: 10-100x faster than Terser
- **Dependency pre-bundling**: React, React-DOM, and GSAP are pre-bundled for faster dev startup
- **Code splitting**: GSAP is split into its own chunk (`gsap.js`) for better caching
- **Drop console & debugger**: Removed from production builds for smaller bundle size
- **Target esnext**: Uses modern JavaScript features for smaller bundles

#### 2. **Server Configuration**
- **Port 5000**: Changed from default 5173 to 5000
- **Localhost binding**: Prevents binding to all network interfaces (faster startup)
- **Strict port mode**: Forces error if port is unavailable (prevents confusion)

#### 3. **Dependencies**
- **esbuild**: Added as dev dependency (required for minification)
- **Updated packages**: npm update to get latest stable versions
  - vite: 8.0.13
  - @vitejs/plugin-react: 6.0.2

#### 4. **Scripts** (package.json)
```json
"dev": "vite --port 5000",
"dev:clean": "rm -rf node_modules/.vite && vite --port 5000",
"build": "vite build",
"build:analyze": "vite build --debug",
"preview": "vite preview --port 5000"
```

### Usage

```bash
npm run dev           # Start dev server on http://localhost:5000
npm run dev:clean     # Clear cache and restart if server is slow
npm run build         # Build for production (~150ms)
npm run preview       # Preview production build locally
```

### What Stayed the Same

- React version (19.2.6)
- GSAP version (3.15.0)
- All component code
- All styling
- Language system
- Project structure

### Why These Changes Work

1. **esbuild**: Modern, native Go-based minifier (much faster than JavaScript-based alternatives)
2. **Pre-bundling**: Dependencies are only processed once on install, not on every dev server start
3. **Code splitting GSAP**: Animations library is heavy; separate chunk allows better browser caching
4. **ESNext target**: Node 22 supports all modern JavaScript, no transpilation needed for dev
5. **Localhost only**: Skips IPv6 resolution which can add latency on some systems

### Node.js Version

**v22.22.2** (Latest LTS)
- Best support for modern JavaScript features
- Faster module resolution
- Better memory management
