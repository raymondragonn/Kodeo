// Mapas de navegación que antes vivían en App.jsx. Se mueven aquí sin cambios
// para que los use tanto Astro (en build, para getStaticPaths) como los
// wrappers de isla (en cliente).

export const NAV_SECTION_MAP = {
  'Servicios': 'services', 'Services': 'services',
  'Trabajo': 'work',       'Work': 'work',
  'Contacto': 'contact',   'Contact': 'contact',
};

export const FAQ_ITEMS = new Set(['Preguntas', 'FAQ']);

export const SERVICE_SLUGS = { '01': 'landing-page', '02': 'sitio-web', '03': 'tienda-online' };
export const SLUG_CODES    = { 'landing-page': '01', 'sitio-web': '02',  'tienda-online': '03' };

export const FOOTER_URL_MAP = {
  'Sobre nosotros': '/sobre-nosotros',     'About us': '/sobre-nosotros',
  'FAQ': '/preguntas',                     'Preguntas': '/preguntas',
  'Landing Page': '/landing-page',
  'Sitio Web': '/sitio-web',               'Website': '/sitio-web',
  'Tienda Online': '/tienda-online',       'Online Store': '/tienda-online',
  'Privacidad': '/privacidad',             'Privacy': '/privacidad',
  'Términos': '/terminos',                 'Terms': '/terminos',
  'Trabajo': '#work',                      'Work': '#work',
  'Clientes': '#testimonials',             'Clients': '#testimonials',
  'Stack': '/stack',
  'Costos': '/costos',                     'Pricing': '/costos',
  // "/extras" nunca existió como página: los planes de mantenimiento se
  // explican en /costos.
  'Mantenimiento': '/costos',              'Maintenance': '/costos',
  'Metodología': '/metodologia',           'Methodology': '/metodologia',
  'Cookies': '/privacidad',
  'Guías': '/guias',                       'Guides': '/guias',
  'Portafolio': '/portafolio',             'Portfolio': '/portafolio',
};

/**
 * URL real de una etiqueta de navegación, apta para el atributo href.
 *
 * Hasta ahora estos destinos solo vivían en un onClick, así que el HTML salía
 * con href="#" y ningún buscador podía seguir un solo enlace interno del sitio.
 *
 * Las anclas se devuelven absolutas ("/#work") para que también funcionen desde
 * una página interna, no solo desde la portada.
 */
export function hrefForLabel(label) {
  const target = FOOTER_URL_MAP[label];
  if (!target) return null;
  return target.startsWith('#') ? `/${target}` : target;
}

/** Destino de un elemento del menú principal, para el href. */
export function hrefForNavItem(item) {
  if (FAQ_ITEMS.has(item)) return '/preguntas';
  const section = NAV_SECTION_MAP[item];
  return section ? `/#${section}` : '/';
}

// Títulos y descripciones de las páginas de servicio (venían del objeto
// `titles` de ServicePageRoute en App.jsx).
// Los títulos apuntan a lo que la gente busca, no al nombre de la marca:
// ~55-60 caracteres, que es lo que Google muestra sin recortar.
export const SERVICE_META = {
  '01': {
    slug: 'landing-page',
    title: 'Diseño de Landing Page Profesional en México | Kodeo',
    description: 'Una página diseñada para convertir visitantes en clientes, con formulario a WhatsApp y hosting incluido. Desde MX$6,500 y entrega en 8 días hábiles.',
    price: 6500,
  },
  '02': {
    slug: 'sitio-web',
    title: 'Diseño de Páginas Web para Empresas y Negocios | Kodeo',
    description: 'Sitio web multipágina que comunica quién eres y genera confianza, adaptado a celulares y con correo corporativo. Desde MX$10,000 y 16 días hábiles.',
    price: 10000,
  },
  '03': {
    slug: 'tienda-online',
    title: 'Crear una Tienda en Línea: Ecommerce a Medida | Kodeo',
    description: 'Tienda en línea con catálogo, carrito, panel de administrador y pasarela de pago (Stripe, PayPal, Mercado Pago). Desde MX$12,000 y 20 días hábiles.',
    price: 12000,
  },
};
