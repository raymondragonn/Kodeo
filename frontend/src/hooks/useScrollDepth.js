import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackScrollDepth } from '../lib/analytics';

const THRESHOLDS = [25, 50, 75, 90];

export function useScrollDepth() {
  const location = useLocation();
  const fired = useRef(new Set());

  useEffect(() => {
    if (location.pathname !== '/') return;
    fired.current = new Set();

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? (window.scrollY / max) * 100 : 100;

      THRESHOLDS.forEach((threshold) => {
        if (percent >= threshold && !fired.current.has(threshold)) {
          fired.current.add(threshold);
          trackScrollDepth({ percent: threshold, page_path: location.pathname });
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);
}
