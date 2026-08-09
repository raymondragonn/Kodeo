/**
 * Convierte las imágenes de public/assets a WebP redimensionado.
 *
 * Estaban a 2560 px y varios megas cada una, para mostrarse en contenedores de
 * 400-900 px: era el principal lastre de carga del sitio y, por tanto, del
 * posicionamiento (LCP).
 *
 * Los originales siguen en src/assets, que actúa de respaldo.
 *
 * Uso: node scripts/optimize-images.mjs [--dry]
 */
import sharp from 'sharp';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'public/assets';
const MAX_WIDTH = 1600;   // suficiente para pantallas retina en los anchos reales de uso
const QUALITY = 82;
const DRY = process.argv.includes('--dry');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let before = 0, after = 0, count = 0;

for await (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

  const original = (await stat(file)).size;
  const target = file.replace(/\.(png|jpe?g)$/i, '.webp');

  const img = sharp(file);
  const meta = await img.metadata();
  const width = Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH);

  if (!DRY) {
    await img.resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(target);
    await unlink(file);
  }

  const size = DRY
    ? (await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()).length
    : (await stat(target)).size;

  before += original; after += size; count++;
  console.log(
    `${(original / 1024).toFixed(0).padStart(6)} KB → ${(size / 1024).toFixed(0).padStart(5)} KB  ` +
    `${path.relative(ROOT, file)}`
  );
}

console.log(
  `\n${count} imágenes · ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB ` +
  `(-${(100 - (after / before) * 100).toFixed(0)}%)${DRY ? '  [simulación]' : ''}`
);
