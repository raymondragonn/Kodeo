// ── Campos del formulario de detalles del proyecto ─────────────────────────
// Compartido entre AppointmentPage (llenado previo a agendar) y
// ClientDashboard (edición/borrador de citas ya agendadas).

export const COMMON_FIELDS = [
  {
    key: 'business_name',
    label: 'Nombre del negocio o marca',
    type: 'text',
    placeholder: 'Ej. Cafetería Luna',
    required: true,
  },
  {
    key: 'business_description',
    label: '¿A qué se dedica tu negocio?',
    type: 'textarea',
    placeholder: 'Ej. Vendemos café de especialidad y pasteles artesanales en Veracruz.',
    required: true,
  },
  {
    key: 'has_domain',
    label: '¿Ya tienes dominio y hosting?',
    type: 'radio',
    options: [
      { value: 'yes',     label: 'Sí, ya tengo' },
      { value: 'no',      label: 'No, necesito uno' },
      { value: 'unknown', label: 'No sé qué es eso' },
    ],
    required: true,
  },
];

export const SERVICE_FIELDS = {
  '01': [
    {
      key: 'goal',
      label: '¿Cuál es el objetivo principal de la página?',
      type: 'radio',
      options: [
        { value: 'leads',     label: 'Captar clientes / leads' },
        { value: 'info',      label: 'Informar sobre mis servicios' },
        { value: 'portfolio', label: 'Mostrar mi portafolio' },
        { value: 'other',     label: 'Otro' },
      ],
      required: true,
    },
    {
      key: 'reference_url',
      label: '¿Hay sitios web que te gusten como referencia? (opcional)',
      type: 'link-list',
      placeholder: 'https://ejemplo.com',
      required: false,
    },
  ],
  '02': [
    {
      key: 'page_count',
      label: '¿Cuántas páginas o secciones necesitas aproximadamente?',
      type: 'radio',
      options: [
        { value: '1-5',  label: '1 – 5 páginas' },
        { value: '6-10', label: '6 – 10 páginas' },
        { value: '10+',  label: 'Más de 10' },
      ],
      required: true,
    },
    {
      key: 'needs_blog',
      label: '¿Necesitas blog o sección de noticias?',
      type: 'radio',
      options: [
        { value: 'yes', label: 'Sí' },
        { value: 'no',  label: 'No' },
      ],
      required: true,
    },
    {
      key: 'reference_url',
      label: '¿Referencias de diseño? (opcional)',
      type: 'link-list',
      placeholder: 'https://ejemplo.com',
      required: false,
    },
  ],
  '03': [
    {
      key: 'product_type',
      label: '¿Qué tipo de productos vas a vender?',
      type: 'text',
      placeholder: 'Ej. Ropa femenina, suplementos, artesanías…',
      required: true,
    },
    {
      key: 'product_count',
      label: '¿Cuántos productos tienes aproximadamente?',
      type: 'radio',
      options: [
        { value: '1-50',  label: 'Menos de 50' },
        { value: '51-200', label: '50 – 200' },
        { value: '200+',  label: 'Más de 200' },
      ],
      required: true,
    },
    {
      key: 'has_payment',
      label: '¿Ya tienes pasarela de pago (Stripe, PayPal, etc.)?',
      type: 'radio',
      options: [
        { value: 'yes',     label: 'Sí' },
        { value: 'no',      label: 'No' },
        { value: 'unknown', label: 'No lo sé' },
      ],
      required: true,
    },
  ],
};

export const OPTION_LABELS = {
  has_domain:    { yes: 'Sí', no: 'No', unknown: 'No sabe' },
  goal:          { leads: 'Captar leads', info: 'Informar servicios', portfolio: 'Portafolio', other: 'Otro' },
  page_count:    { '1-5': '1–5 páginas', '6-10': '6–10 páginas', '10+': 'Más de 10' },
  needs_blog:    { yes: 'Sí', no: 'No' },
  product_count: { '1-50': 'Menos de 50', '51-200': '50–200', '200+': 'Más de 200' },
  has_payment:   { yes: 'Sí', no: 'No', unknown: 'No lo sé' },
};

export function getFieldsForService(serviceCode) {
  return [...COMMON_FIELDS, ...(SERVICE_FIELDS[serviceCode] || SERVICE_FIELDS['01'])];
}

export const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
