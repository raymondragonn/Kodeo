/**
 * Se ejecuta de forma bloqueante en el <head>, antes del primer pintado.
 *
 * Va como archivo externo y no inline a propósito: la CSP de vercel.json es
 * `script-src 'self'` sin 'unsafe-inline', así que un script inline exigiría
 * hash o nonce.
 */
(function () {
  var d = document.documentElement;

  /* ── Tema ──────────────────────────────────────────────────────────────
     Antes lo aplicaba un useEffect de App.jsx. Con navegación entre páginas
     eso provocaría un parpadeo de tema en cada carga. */
  try {
    var saved = localStorage.getItem('theme');
    d.dataset.theme = (saved === 'light' || saved === 'dark')
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) {
    d.dataset.theme = 'dark';
  }

  /* ── Breakpoint ────────────────────────────────────────────────────────
     El HTML se pre-renderiza en la variante móvil (Googlebot indexa
     mobile-first). El layout responsive del proyecto son ternarios JS
     inline, no media queries, así que un visitante de escritorio vería el
     layout móvil hasta que React hidrata. Lo ocultamos ese instante; en
     móvil no se oculta nada y el pintado es inmediato. */
  if (!window.matchMedia('(max-width: 767px)').matches) {
    d.setAttribute('data-bp-mismatch', '');
    // Red de seguridad: si la hidratación falla, el contenido no se queda
    // invisible para siempre.
    setTimeout(function () { d.removeAttribute('data-bp-mismatch'); }, 2000);
  }
})();
