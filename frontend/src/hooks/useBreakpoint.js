import { useEffect, useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(callback) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

// El HTML se genera en build, cuando no hay viewport que medir. Se
// pre-renderiza la variante móvil porque Googlebot indexa mobile-first y es el
// grueso del tráfico real; public/boot.js evita que un visitante de escritorio
// vea el layout móvil mientras React hidrata.
const getServerSnapshot = () => true;

export function useBreakpoint() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Ya hay breakpoint real: se puede mostrar el contenido.
  useEffect(() => {
    document.documentElement.removeAttribute('data-bp-mismatch');
  }, []);

  return { isMobile };
}
