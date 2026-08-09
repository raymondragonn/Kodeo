/**
 * Datos del negocio para los datos estructurados (schema.org).
 *
 * Es la ficha que Google y los motores generativos usan para saber quién es
 * Kodeo, dónde está y cómo contactarla. Cuanto más completa, mejor posiciona en
 * búsquedas locales ("agencia web veracruz") y con más precisión te citan.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PENDIENTE — completar con datos reales. Los campos en null simplemente no
 *  se emiten, así que el sitio funciona sin ellos, pero cada uno que falta es
 *  señal local que se deja sobre la mesa. NO inventar ninguno.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const BUSINESS = {
  name: 'Kodeo',
  description:
    'Estudio de productos digitales en Veracruz, México. Diseño, desarrollo y despliegue de Landing Pages, Sitios Web y Tiendas Online.',
  priceRange: 'MX$6,500 - MX$12,000+',

  address: {
    locality: 'Veracruz',
    region: 'Veracruz',
    country: 'MX',
    /** Calle y número. Solo si hay una dirección pública real. */
    street: null,
    /** Código postal. */
    postalCode: null,
  },

  /** Formato internacional: '+52 229 123 4567'. Google lo usa para el botón de llamada. */
  telephone: null,

  /** Correo de contacto público. */
  email: null,

  /**
   * Coordenadas del negocio. Se sacan de Google Maps: clic derecho sobre el
   * punto → las dos cifras que aparecen arriba.
   */
  geo: { latitude: null, longitude: null },

  /**
   * Horario de atención en formato schema.org.
   * Ejemplo: ['Mo-Fr 09:00-18:00', 'Sa 10:00-14:00']
   */
  openingHours: null,

  /** Perfiles oficiales. El de Google Business Profile es el que más pesa. */
  sameAs: [
    'https://x.com/kodeomx',
    'https://www.instagram.com/kodeo.mx/',
    'https://www.facebook.com/people/Kodeo/61578084553181/',
    'https://www.linkedin.com/company/kodeo',
    // 'https://www.google.com/maps/place/...',  ← Google Business Profile
  ],
};

/** Ficha en formato schema.org, omitiendo lo que no esté definido. */
export function businessSchema(site) {
  const b = BUSINESS;
  const hasGeo = b.geo.latitude != null && b.geo.longitude != null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site}/#organization`,
    name: b.name,
    url: site,
    logo: `${site}/favicon.svg`,
    image: `${site}/og-image.png`,
    description: b.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: b.address.locality,
      addressRegion: b.address.region,
      addressCountry: b.address.country,
      ...(b.address.street ? { streetAddress: b.address.street } : {}),
      ...(b.address.postalCode ? { postalCode: b.address.postalCode } : {}),
    },
    areaServed: { '@type': 'Country', name: 'México' },
    priceRange: b.priceRange,
    sameAs: b.sameAs,
    ...(b.telephone ? { telephone: b.telephone } : {}),
    ...(b.email ? { email: b.email } : {}),
    ...(hasGeo
      ? { geo: { '@type': 'GeoCoordinates', latitude: b.geo.latitude, longitude: b.geo.longitude } }
      : {}),
    ...(b.openingHours ? { openingHoursSpecification: b.openingHours } : {}),
  };
}
