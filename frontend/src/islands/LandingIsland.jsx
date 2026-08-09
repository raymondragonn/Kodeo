import Nav from '../components/Nav';
import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import Services from '../components/Services';
import Projects from '../components/Projects';
import Testimonials from '../components/Testimonials';
import Stats from '../components/Stats';
import CtaSection from '../components/CtaSection';
import Footer from '../components/Footer';
import { useSharedNavProps } from '../lib/useSharedNavProps';

/**
 * La landing completa. Se hidrata de una sola vez, no sección por sección:
 * Projects hace un pin horizontal con ScrollTrigger y necesita que el layout
 * de la página esté estable para calcular las distancias de scroll.
 *
 * Reproduce el bloque de la ruta "/" de App.jsx sin tocar los componentes.
 */
export default function LandingIsland() {
  const p = useSharedNavProps();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav
        copy={p.copy}
        onLogoClick={p.onLogoClick}
        onNavItemClick={p.onNavItemClick}
        onContact={p.onContact}
        onServiceClick={p.onServiceClick}
        onAuthClick={p.onAuthClick}
        onLogout={p.onLogout}
        user={p.user}
        theme={p.theme}
        onThemeToggle={p.onThemeToggle}
      />
      <Hero copy={p.copy} motionSpeed={p.motionSpeed} />
      <Marquee motionSpeed={p.motionSpeed} />
      <Services copy={p.copy} motionSpeed={p.motionSpeed} />
      <Projects copy={p.copy} motionSpeed={p.motionSpeed} />
      <Testimonials copy={p.copy} motionSpeed={p.motionSpeed} />
      <Stats copy={p.copy} motionSpeed={p.motionSpeed} />
      <CtaSection copy={p.copy} motionSpeed={p.motionSpeed} />
      <Footer copy={p.copy} motionSpeed={p.motionSpeed} onNavigate={p.onNavigate} />
    </div>
  );
}
