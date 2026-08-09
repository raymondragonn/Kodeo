import { COPY } from '../data/copy';
import { useLang } from './lang';
import { useTheme, toggleTheme } from './theme';
import { useUser, logout } from './session';
import { trackCtaClick } from './analytics';
import { NAV_SECTION_MAP, FAQ_ITEMS, SERVICE_SLUGS, FOOTER_URL_MAP } from './routes';

// Velocidad de las animaciones GSAP. En App.jsx era `useState(0.8)` sin setter
// —una constante disfrazada—, así que aquí es una constante de verdad.
export const MOTION_SPEED = 0.8;

/**
 * Reconstruye el objeto `sharedNavProps` que App.jsx repartía a casi todas las
 * páginas. Las funciones no pueden cruzar el límite Astro→React (no son
 * serializables), así que se crean aquí, dentro de la isla.
 *
 * `copy` se resuelve en cliente con useLang(): en build sale español —que es lo
 * que se indexa— y si el navegador está en inglés, la hidratación lo cambia.
 */
export function useSharedNavProps() {
  const lang  = useLang();
  const theme = useTheme();
  const user  = useUser();
  const copy  = COPY[lang] || COPY.es;

  const goToSection = (id) => {
    if (window.location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.assign(`/#${id}`);
    }
  };

  const handleNavItemClick = (item) => {
    trackCtaClick({
      cta_id: `nav_${item}`,
      section: 'nav',
      destination: FAQ_ITEMS.has(item) ? '/preguntas' : `#${NAV_SECTION_MAP[item] || ''}`,
    });
    if (FAQ_ITEMS.has(item)) { window.location.assign('/preguntas'); return; }
    const id = NAV_SECTION_MAP[item];
    if (id) goToSection(id);
  };

  const handleContactClick = () => {
    trackCtaClick({ cta_id: 'nav_contacto', section: 'nav', destination: '#contact' });
    goToSection('contact');
  };

  const handleServiceClick = (code) => {
    trackCtaClick({ cta_id: 'service_row', section: 'services', destination: `/${SERVICE_SLUGS[code]}` });
    window.location.assign(`/${SERVICE_SLUGS[code]}`);
  };

  const handleFooterNavigate = (label) => {
    const target = FOOTER_URL_MAP[label];
    if (!target) return;
    if (target.startsWith('#')) goToSection(target.slice(1));
    else window.location.assign(target);
  };

  return {
    copy,
    motionSpeed: MOTION_SPEED,
    user,
    theme,
    onThemeToggle: toggleTheme,
    onNavItemClick: handleNavItemClick,
    onContact: handleContactClick,
    onServiceClick: handleServiceClick,
    onAuthClick: (route) => window.location.assign(`/${route}`),
    onLogout: logout,
    onNavigate: handleFooterNavigate,
    onLogoClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    onBack: () => window.location.assign('/'),
  };
}
