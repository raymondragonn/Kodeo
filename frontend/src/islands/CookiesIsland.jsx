import { useEffect } from 'react';
import CookiesBanner from '../components/CookiesBanner';
import { useContentProtection } from '../hooks/useContentProtection';
import { useScrollDepth } from '../hooks/useScrollDepth';
import { initAnalytics, trackPageView } from '../lib/analytics';
import { COPY } from '../data/copy';
import { useLang } from '../lib/lang';

/**
 * Isla global, montada desde Base.astro en todas las páginas. Reúne lo que
 * App.jsx hacía fuera de <Routes>: protección de contenido, scroll depth,
 * analítica y el banner de cookies.
 */
export default function CookiesIsland() {
  const copy = COPY[useLang()] || COPY.es;

  useContentProtection();
  useScrollDepth();

  useEffect(() => {
    if (localStorage.getItem('kodeo_cookies_consent') === 'accepted') initAnalytics();
    trackPageView(window.location.pathname);
  }, []);

  // El navegador salta al ancla antes de que las islas hidraten, y si el
  // visitante viene de otra página el destino puede estar aún oculto por
  // data-bp-mismatch. Se reintenta una vez ya montados.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <CookiesBanner
      copy={copy}
      onOpenPolicy={() => window.location.assign('/privacidad')}
      onAccept={initAnalytics}
    />
  );
}
