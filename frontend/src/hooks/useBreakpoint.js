import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const check = (event) => setIsMobile(event.matches);
    media.addEventListener('change', check);
    return () => media.removeEventListener('change', check);
  }, []);

  return { isMobile };
}
