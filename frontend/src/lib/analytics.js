const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let gaInitialized = false;
let metaPixelInitialized = false;

export function initAnalytics() {
  initGoogleAnalytics();
  initMetaPixel();
}

function initGoogleAnalytics() {
  if (!GA_ID || gaInitialized) return;

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args) { window.dataLayer.push(args); };
  window.gtag('js', new Date());
  // send_page_view en false: los page_view se mandan a mano por ruta (ver trackPageView),
  // porque react-router-dom no recarga la página entre rutas.
  // debug_mode en dev: marca estos eventos como tráfico de desarrollador para que el
  // filtro "Tráfico de desarrolladores" de GA4 los excluya de los informes estándar,
  // sin necesitar una segunda propiedad/Measurement ID para desarrollo.
  window.gtag('config', GA_ID, { send_page_view: false, debug_mode: import.meta.env.DEV });

  gaInitialized = true;
}

function initMetaPixel() {
  if (!META_PIXEL_ID || metaPixelInitialized) return;

  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');

  metaPixelInitialized = true;
}

export function trackEvent(name, params = {}) {
  if (!gaInitialized || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackPageView(path) {
  trackEvent('page_view', { page_path: path });
}

export function trackCtaClick({ cta_id, cta_text, section, destination }) {
  trackEvent('cta_click', { cta_id, cta_text, section, destination });
}

export function trackFormStart({ form_id, form_location }) {
  trackEvent('form_start', { form_id, form_location });
}

export function trackFormSubmit({ form_id, form_location }) {
  trackEvent('form_submit', { form_id, form_location });
}

export function trackDownload({ resource_name, resource_url, section }) {
  trackEvent('resource_download', { resource_name, resource_url, section });
}

// Reservado para cuando exista un video en la landing — todavía no hay ninguno,
// así que no hay componente que la dispare hoy.
export function trackVideoPlay({ video_id, section }) {
  trackEvent('video_play', { video_id, section });
}

export function trackScrollDepth({ percent, page_path }) {
  trackEvent('scroll_depth', { percent, page_path });
}
