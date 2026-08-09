import { useEffect, useRef } from 'react';
import { trackScrollDepth } from '../lib/analytics';

const THRESHOLDS = [25, 50, 75, 90];

export function useScrollDepth() {
  const fired = useRef(new Set());

  useEffect(() => {
    // Solo mide la landing. Ya no depende de react-router: con páginas
    // separadas, cada carga trae su propia ruta en window.location.
    const pathname = window.location.pathname;
    if (pathname !== '/') return;
    fired.current = new Set();

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? (window.scrollY / max) * 100 : 100;

      THRESHOLDS.forEach((threshold) => {
        if (percent >= threshold && !fired.current.has(threshold)) {
          fired.current.add(threshold);
          trackScrollDepth({ percent: threshold, page_path: pathname });
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}
