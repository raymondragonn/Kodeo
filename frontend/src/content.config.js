import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Guías: artículos en Markdown. Es el canal para las búsquedas informativas
// ("cuánto cuesta una página web") que las páginas comerciales no cubren, y la
// principal fuente de citas en los motores generativos.
const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guias' }),
  schema: z.object({
    title: z.string(),          // el <title> y el H1
    description: z.string(),    // meta description
    // Respuesta directa a la pregunta del título. Va destacada al principio:
    // es lo que un motor generativo extrae como respuesta.
    answer: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default('Kodeo'),
    /** Servicio con el que se relaciona, para el enlace interno. */
    service: z.enum(['landing-page', 'sitio-web', 'tienda-online', 'tarjeta-fidelidad']).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guias };
