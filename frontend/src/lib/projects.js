import { COPY } from '../data/copy';

// Slug de cada proyecto para su URL de caso de estudio. Se fija a mano y no se
// deriva del nombre: son URLs públicas y no deben cambiar si se retoca el copy.
export const PROJECT_SLUGS = {
  'InCup': 'incup',
  'Tudi': 'tudi',
  'Fer & Sean': 'fer-and-sean',
  'Stratpharma Iberia': 'stratpharma-iberia',
  'Aranza Mondragón': 'aranza-mondragon',
};

// Portadas y galerías. Estaban duplicadas en Projects.jsx y ProjectModal.jsx;
// aquí las comparten también las páginas de caso de estudio.
export const PROJECT_COVERS = {
  '01': '/assets/projects/incup/incup-mockup-cover.webp',
  '02': '/assets/projects/tudi/tudi-mockup-cover.webp',
  '03': '/assets/projects/ferboda/ferboda-mockup-cover.webp',
  '04': '/assets/projects/stratpharma/stratpharma-mockup-cover.webp',
  '05': '/assets/projects/aramondra/aramondra-mockup-cover.webp',
};

// Portadas de cada producto (los mockups del panel de la sección Productos).
// Las comparten la sección y la página de detalle de cada producto.
export const SERVICE_COVERS = {
  '01': '/assets/projects/landingpage-cover.webp',
  '02': '/assets/projects/website-cover.webp',
  '03': '/assets/projects/tiendaenlinea-cover.webp',
  '04': '/assets/projects/tarjetafidelidad-cover.webp',
};

export const PROJECT_SHOTS = {
  '01': ['/assets/projects/incup/incup-1.webp', '/assets/projects/incup/incup-2.webp', '/assets/projects/incup/incup-3.webp'],
  '02': ['/assets/projects/tudi/tudi-1.webp', '/assets/projects/tudi/tudi-2.webp', '/assets/projects/tudi/tudi-3.webp'],
  '03': ['/assets/projects/ferboda/ferboda-2.webp', '/assets/projects/ferboda/ferboda-3.webp', '/assets/projects/ferboda/ferboda-4.webp', '/assets/projects/ferboda/ferboda-5.webp', '/assets/projects/ferboda/ferboda-6.webp'],
  '04': ['/assets/projects/stratpharma/stratpharma-1.webp', '/assets/projects/stratpharma/stratpharma-2.webp', '/assets/projects/stratpharma/stratpharma-3.webp'],
  '05': ['/assets/projects/aramondra/aramondra-1.webp', '/assets/projects/aramondra/aramondra-2.webp', '/assets/projects/aramondra/aramondra-3.webp'],
};

/** Los proyectos con su slug, portada y galería resueltas. */
export function getProjects() {
  return COPY.es.projects.items
    .filter((p) => PROJECT_SLUGS[p.name])
    .map((p) => ({
      ...p,
      slug: PROJECT_SLUGS[p.name],
      cover: PROJECT_COVERS[p.idx],
      shots: PROJECT_SHOTS[p.idx] ?? [],
    }));
}

export function getProject(slug) {
  return getProjects().find((p) => p.slug === slug) ?? null;
}
