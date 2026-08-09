/**
 * Reemplazo de react-router-dom para las páginas que ahora sirve Astro.
 *
 * Las 11 rutas públicas son páginas estáticas independientes, así que no hay
 * router de por medio: la navegación es del navegador. Esto expone la misma
 * firma que react-router para que los componentes solo cambien su línea de
 * import y no una sola línea más de su cuerpo.
 *
 * El portal privado sigue usando react-router-dom de verdad (ver SpaApp.jsx).
 */

const EMPTY = {};

/** navigate(to) y navigate(to, { replace }). El segundo argumento `state` no
 *  existe en navegación entre páginas; ninguna ruta pública lo usa. */
export function useNavigate() {
  return (to, options = EMPTY) => {
    if (typeof to === 'number') {           // navigate(-1)
      window.history.go(to);
      return;
    }
    if (options.replace) window.location.replace(to);
    else window.location.assign(to);
  };
}

export function useLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '', state: null };
  }
  const { pathname, search, hash } = window.location;
  return { pathname, search, hash, state: null };
}

export function useParams() {
  return EMPTY;
}
