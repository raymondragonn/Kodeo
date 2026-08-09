// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// Fecha de publicación/actualización de cada guía, para el lastmod del sitemap.
// Solo se declara donde el dato es real: un lastmod inventado en todas las URLs
// es una señal que Google acaba ignorando.
const guiaDates = Object.fromEntries(
  readdirSync('./src/content/guias')
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(`./src/content/guias/${f}`, 'utf8');
      const updated = raw.match(/^updatedAt:\s*(\S+)/m)?.[1];
      const published = raw.match(/^publishedAt:\s*(\S+)/m)?.[1];
      return [`/guias/${f.replace(/\.md$/, '')}/`, updated ?? published];
    })
    .filter(([, date]) => date),
);

// Rutas privadas / transaccionales: se sirven como SPA y no deben entrar al sitemap.
const NO_INDEX = /^https:\/\/kodeo\.mx\/(login|register|recuperar|restablecer|comprar|pago|pago-confirmado|citas|panel|proyectos|pedidos|cuenta|analiticas|usuarios|agendar|resena)/;

// Los 3 rutas con parámetro libre (/resena/:token, /pago/orden/:token,
// /usuarios/:id) no se pueden enumerar en build, así que en producción
// vercel.json las reescribe a su página contenedora sin cambiar la URL.
// `astro dev` no lee vercel.json, así que sin esto esas rutas dan 404 en
// local (y el 404 propio redirige a "/" vía meta refresh — parecía que el
// link "no funcionaba"). Se replica aquí la misma tabla solo para dev.
function devRewrites() {
  const REWRITES = [
    [/^\/resena\/[^/]+\/?$/, '/resena'],
    [/^\/pago\/orden\/[^/]+\/?$/, '/pago'],
    [/^\/usuarios\/[^/]+\/?$/, '/usuarios'],
  ];
  return {
    name: 'dev-rewrites',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const [pathname, search = ''] = req.url.split('?');
          const hit = REWRITES.find(([pattern]) => pattern.test(pathname));
          if (hit) req.url = hit[1] + (search ? `?${search}` : '');
          next();
        });
      },
    },
  };
}

export default defineConfig({
  site: 'https://kodeo.mx',
  output: 'static',
  outDir: '../dist',

  integrations: [
    react(),
    devRewrites(),
    sitemap({
      filter: (page) => !NO_INDEX.test(page),
      serialize(item) {
        const date = guiaDates[new URL(item.url).pathname];
        if (date) item.lastmod = new Date(date).toISOString();
        return item;
      },
    }),
  ],

  // Astro hidrata las islas con scripts inline. La CSP del sitio es
  // `script-src 'self'` sin 'unsafe-inline', así que sin esto no se hidrataría
  // nada: Astro calcula el hash de cada script en build y lo publica en un
  // <meta>. En vercel.json se quitaron script-src y style-src para que no
  // choquen con el que se emite aquí.
  security: {
    csp: {
      scriptDirective: {
        resources: [
          "'self'",
          'https://js.stripe.com',
          // analytics.js inyecta gtag; no estaba permitido en la CSP anterior.
          'https://www.googletagmanager.com',
        ],
      },
      // Cuando una CSP lleva hashes, el navegador ignora 'unsafe-inline'. Todo
      // el layout de este sitio son atributos style="" y algunos componentes
      // del portal inyectan <style> en runtime, así que style-src tiene que
      // quedar sin hashes: por eso el CSS se sirve como archivo externo
      // (build.inlineStylesheets), y así Astro no genera ninguno.
      styleDirective: {
        resources: [
          "'self'",
          "'unsafe-inline'",
          // Astro no pone hashes en style-src-attr, así que aquí
          // 'unsafe-inline' sí surte efecto: es lo que sostiene todos los
          // atributos style="" del sitio.
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },

  // Ver la nota de CSP: con el CSS inline, Astro añadiría hashes a style-src y
  // eso anularía 'unsafe-inline', que es lo que sostiene todos los estilos del
  // sitio (están en atributos style="").
  build: { inlineStylesheets: 'never' },

  vite: {
    // Astro expone por defecto solo las variables PUBLIC_*. El proyecto usa
    // VITE_* en .env, .env.production, el panel de Vercel y en todo el código
    // (API_BASE_URL, Firebase, GA), así que se mantiene ese prefijo en lugar de
    // renombrar 13 variables en cuatro sitios.
    envPrefix: 'VITE_',

    server: {
      port: 5001,
      host: 'localhost',
      strictPort: false,
      // Necesario para el popup de Google/Firebase en desarrollo.
      headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
    },
    build: { target: 'esnext' },
    optimizeDeps: { include: ['react', 'react-dom', 'gsap'] },
  },
});
