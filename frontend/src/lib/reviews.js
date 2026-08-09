import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Reseñas reales de clientes, leídas del backend en tiempo de compilación.
 *
 * Solo llegan aquí las que el cliente marcó como publicables (`puede_publicar`),
 * así que no hay que filtrar nada más. No se inventan valoraciones: si no hay
 * reseñas, no se emite AggregateRating.
 *
 * Se guarda una copia en .cache/ para que un backend caído no rompa el
 * despliegue: en ese caso se publica la última versión conocida.
 */
const CACHE = '.cache/reviews.json';
const EMPTY = { reviews: [], total: 0, promedio: null };

// El build genera decenas de páginas y todas montan el mismo layout: se pide
// una sola vez por proceso.
let pending = null;

export function getPublicReviews() {
  pending ??= fetchPublicReviews();
  return pending;
}

async function fetchPublicReviews() {
  const base = import.meta.env.VITE_BACKEND_URL;
  if (!base) return readCache();

  try {
    const res = await fetch(`${base}/reviews.php?action=public`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const data = json.data ?? json;
    if (!Array.isArray(data.reviews)) throw new Error('respuesta inesperada');

    await writeCache(base, data);
    return data;
  } catch (error) {
    console.warn(`[reviews] no se pudo leer el backend (${error.message}); se usa la caché.`);
    return readCache(base);
  }
}

// La caché guarda de qué backend vino: si no coincide con el actual se
// descarta, para que un build local nunca publique reseñas de desarrollo.
async function readCache(base) {
  try {
    const cached = JSON.parse(await readFile(CACHE, 'utf8'));
    return cached.source === base ? cached.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function writeCache(source, data) {
  try {
    await mkdir(path.dirname(CACHE), { recursive: true });
    await writeFile(CACHE, JSON.stringify({ source, data }, null, 2));
  } catch {
    /* la caché es un extra; si no se puede escribir, no pasa nada */
  }
}

/**
 * Bloque AggregateRating + Review para schema.org.
 * Devuelve null si todavía no hay reseñas publicables.
 */
export function reviewsSchema({ reviews, total, promedio }, siteId) {
  if (!total || !promedio) return null;

  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: promedio,
      reviewCount: total,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews
      .filter((r) => r.feedback)
      .slice(0, 10)
      .map((r) => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        reviewBody: r.feedback,
        datePublished: r.submitted_at?.slice(0, 10),
        itemReviewed: { '@id': siteId },
        // Solo si el cliente indicó con qué nombre aparecer. Sin ese dato la
        // reseña se publica sin autor: no se deduce de la cuenta de usuario,
        // porque ese nombre se dio para otra cosa.
        ...(r.autor_nombre
          ? {
              author: {
                '@type': 'Person',
                name: r.autor_nombre,
                ...(r.autor_rol ? { jobTitle: r.autor_rol } : {}),
              },
            }
          : {}),
      })),
  };
}
