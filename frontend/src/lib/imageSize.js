import sharp from 'sharp';
import path from 'node:path';

/**
 * Dimensiones reales de una imagen de public/, para poder emitir width y height
 * en el HTML y que el navegador reserve el espacio antes de descargarla (evita
 * que el contenido salte al cargar).
 *
 * Solo se usa desde páginas .astro: corre en build, nunca en el navegador.
 */
const cache = new Map();

export async function imageSize(publicPath) {
  if (cache.has(publicPath)) return cache.get(publicPath);
  try {
    const { width, height } = await sharp(path.join('public', publicPath.replace(/^\//, ''))).metadata();
    const size = width && height ? { width, height } : null;
    cache.set(publicPath, size);
    return size;
  } catch {
    cache.set(publicPath, null);
    return null;
  }
}
