import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { useContentProtection } from './hooks/useContentProtection';
import { COPY } from './data/copy';

// Critical path — loaded eagerly (above the fold)
import Nav from './components/Nav';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Services from './components/Services';
import Projects from './components/Projects';
import Testimonials from './components/Testimonials';
import Stats from './components/Stats';
import CtaSection from './components/CtaSection';
import Footer from './components/Footer';
import CookiesBanner from './components/CookiesBanner';
import PageMeta from './components/PageMeta';

// Secondary routes — split into separate chunks, loaded on demand
const ServicePage      = lazy(() => import('./components/ServicePage'));
const FaqPage          = lazy(() => import('./components/FaqPage'));
const AboutPage        = lazy(() => import('./components/AboutPage'));
const PrivacyPage      = lazy(() => import('./components/PrivacyPage'));
const TermsPage        = lazy(() => import('./components/TermsPage'));
const StackPricingPage = lazy(() => import('./components/StackPricingPage'));
const ExtrasPage       = lazy(() => import('./components/ExtrasPage'));
const MethodologyPage  = lazy(() => import('./components/MethodologyPage'));
const StackPage        = lazy(() => import('./components/StackPage'));
const LoginPage        = lazy(() => import('./components/LoginPage'));
const RegisterPage     = lazy(() => import('./components/RegisterPage'));
const OrdersPage       = lazy(() => import('./components/OrdersPage'));
const AccountPage      = lazy(() => import('./components/AccountPage'));
const Checkout         = lazy(() => import('./components/Checkout'));

const NAV_SECTION_MAP = {
  'Servicios': 'services', 'Services': 'services',
  'Trabajo': 'work',       'Work': 'work',
  'Contacto': 'contact',   'Contact': 'contact',
};

const FAQ_ITEMS = new Set(['Preguntas', 'FAQ']);

const SERVICE_SLUGS = { '01': 'landing-page', '02': 'sitio-web', '03': 'tienda-online' };
const SLUG_CODES    = { 'landing-page': '01', 'sitio-web': '02',  'tienda-online': '03' };

const FOOTER_URL_MAP = {
  'Sobre nosotros': '/sobre-nosotros',     'About us': '/sobre-nosotros',
  'FAQ': '/preguntas',                     'Preguntas': '/preguntas',
  'Landing Page': '/landing-page',
  'Sitio Web': '/sitio-web',               'Website': '/sitio-web',
  'Tienda Online': '/tienda-online',       'Online Store': '/tienda-online',
  'Privacidad': '/privacidad',             'Privacy': '/privacidad',
  'Términos': '/terminos',                 'Terms': '/terminos',
  'Trabajo': '#work',                      'Work': '#work',
  'Clientes': '#testimonials',             'Clients': '#testimonials',
  'Stack': '/stack',
  'Costos': '/costos',                     'Pricing': '/costos',
  'Mantenimiento': '/extras',              'Maintenance': '/extras',
  'Metodología': '/metodologia',           'Methodology': '/metodologia',
};

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
}

export default function App() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [motionSpeed] = useState(0.8);
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser]   = useState(getStoredUser);
  useContentProtection();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const browserLang = navigator.language || navigator.languages?.[0] || 'es';
  const lang        = browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
  const copy        = COPY[lang] || COPY.es;

  const scrollToSection = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (scrollTo) {
      setTimeout(() => scrollToSection(scrollTo), 80);
      window.history.replaceState({}, '');
    }
  }, [location.state?.scrollTo]);

  const goToSection = (id) => {
    if (location.pathname === '/') {
      scrollToSection(id);
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  };

  const handleNavItemClick = (item) => {
    if (FAQ_ITEMS.has(item)) { navigate('/preguntas'); return; }
    const id = NAV_SECTION_MAP[item];
    if (id) goToSection(id);
  };

  const handleServiceClick = (code) => navigate(`/${SERVICE_SLUGS[code]}`);
  const handleBack         = () => navigate('/');
  const handleExtrasClick  = () => navigate('/extras');
  const handleAuthClick    = (route) => navigate(`/${route}`);
  const handleLogout       = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };
  const handleLoginSuccess  = (userData) => setUser(userData);
  const handleUserUpdate    = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleFooterNavigate = (label) => {
    const target = FOOTER_URL_MAP[label];
    if (!target) return;
    if (target.startsWith('#')) {
      goToSection(target.slice(1));
    } else {
      navigate(target);
    }
  };

  const sharedNavProps = {
    copy,
    motionSpeed,
    onNavItemClick: handleNavItemClick,
    onContact: () => goToSection('contact'),
    onServiceClick: handleServiceClick,
    onExtrasClick: handleExtrasClick,
    onAuthClick: handleAuthClick,
    onLogout: handleLogout,
    user,
    onNavigate: handleFooterNavigate,
    theme,
    onThemeToggle: toggleTheme,
  };

  return (
    <>
      <Suspense fallback={null}>
      <Routes>

        {/* ── Landing ── */}
        <Route path="/" element={
          <>
            <PageMeta
              title="Kodeo | Agencia Digital Veracruzana"
              description="Diseñamos, programamos y desplegamos experiencias web premium. Landing Pages, Sitios Web y Tiendas Online desde Veracruz, México."
              path="/"
            />
            <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
              <Nav
                copy={copy}
                onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onNavItemClick={handleNavItemClick}
                onContact={() => goToSection('contact')}
                onServiceClick={handleServiceClick}
                onExtrasClick={handleExtrasClick}
                onAuthClick={handleAuthClick}
                onLogout={handleLogout}
                user={user}
                theme={theme}
                onThemeToggle={toggleTheme}
              />
              <Hero copy={copy} motionSpeed={motionSpeed} />
              <Marquee motionSpeed={motionSpeed} />
              <Services copy={copy} motionSpeed={motionSpeed} onServiceClick={handleServiceClick} onExtrasClick={handleExtrasClick} />
              <Projects copy={copy} motionSpeed={motionSpeed} />
              <Testimonials copy={copy} motionSpeed={motionSpeed} />
              <Stats copy={copy} motionSpeed={motionSpeed} />
              <CtaSection copy={copy} motionSpeed={motionSpeed} />
              <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={handleFooterNavigate} />
            </div>
          </>
        } />

        {/* ── Sobre nosotros ── */}
        <Route path="/sobre-nosotros" element={
          <>
            <PageMeta
              title="Sobre Nosotros | Kodeo"
              description="Somos Kodeo, un estudio de productos digitales fundado en Veracruz, MX. Conoce quiénes somos, nuestra visión y cómo trabajamos."
              path="/sobre-nosotros"
            />
            <AboutPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Preguntas ── */}
        <Route path="/preguntas" element={
          <>
            <PageMeta
              title="Preguntas Frecuentes | Kodeo"
              description="Resolvemos tus dudas sobre diseño y desarrollo web. Tiempos de entrega, precios, proceso y más."
              path="/preguntas"
            />
            <FaqPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Metodología ── */}
        <Route path="/metodologia" element={
          <>
            <PageMeta
              title="Metodología | Kodeo"
              description="Nuestro proceso: Diagnóstico, Diseño, Desarrollo y Despliegue. Siempre sabrás en qué fase nos encontramos."
              path="/metodologia"
            />
            <MethodologyPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Stack ── */}
        <Route path="/stack" element={
          <>
            <PageMeta
              title="Stack Tecnológico | Kodeo"
              description="Las tecnologías con las que construimos tu presencia digital: React, Next.js, Angular, FastAPI, Vercel, Hostinger y más."
              path="/stack"
            />
            <StackPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Costos ── */}
        <Route path="/costos" element={
          <>
            <PageMeta
              title="Costos | Kodeo"
              description="Precios claros para Landing Pages desde MX$6,500, Sitios Web desde MX$10,000 y Tiendas Online desde MX$12,000. Sin letra pequeña."
              path="/costos"
            />
            <StackPricingPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Extras ── */}
        <Route path="/extras" element={
          <>
            <PageMeta
              title="Mantenimiento y Branding | Kodeo"
              description="Servicios adicionales: mantenimiento web, actualización de contenido, branding y más para mantener tu presencia digital al día."
              path="/extras"
            />
            <ExtrasPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Privacidad ── */}
        <Route path="/privacidad" element={
          <>
            <PageMeta
              title="Aviso de Privacidad | Kodeo"
              description="Conoce cómo Kodeo recopila, usa y protege tu información personal conforme a la normativa mexicana."
              path="/privacidad"
            />
            <PrivacyPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Términos ── */}
        <Route path="/terminos" element={
          <>
            <PageMeta
              title="Términos y Condiciones | Kodeo"
              description="Términos y condiciones de los servicios de diseño y desarrollo web de Kodeo. Léelos antes de contratar."
              path="/terminos"
            />
            <TermsPage {...sharedNavProps} onBack={handleBack} />
          </>
        } />

        {/* ── Servicios ── */}
        <Route path="/:slug" element={
          <ServicePageRoute
            copy={copy}
            motionSpeed={motionSpeed}
            onBack={handleBack}
            onNavItemClick={handleNavItemClick}
            onContact={() => goToSection('contact')}
            onNavigate={handleFooterNavigate}
            onServiceClick={handleServiceClick}
            onExtrasClick={handleExtrasClick}
          />
        } />

        {/* ── Mis pedidos ── */}
        <Route path="/pedidos" element={
          <>
            <PageMeta title="Mis pedidos | Kodeo" description="Revisa el estado de tus proyectos." path="/pedidos" />
            <OrdersPage user={user} onNavigate={navigate} onLogout={handleLogout} copy={copy} theme={theme} onThemeToggle={toggleTheme} />
          </>
        } />

        {/* ── Cuenta ── */}
        <Route path="/cuenta" element={
          <>
            <PageMeta title="Mi cuenta | Kodeo" description="Administra tu información de cuenta." path="/cuenta" />
            <AccountPage user={user} onNavigate={navigate} onLogout={handleLogout} onUserUpdate={handleUserUpdate} copy={copy} theme={theme} onThemeToggle={toggleTheme} />
          </>
        } />

        {/* ── Login ── */}
        <Route path="/login" element={
          <>
            <PageMeta title="Iniciar sesión | Kodeo" description="Accede a tu cuenta Kodeo." path="/login" />
            <LoginPage copy={copy} theme={theme} onThemeToggle={toggleTheme} onNavigate={navigate} onLoginSuccess={handleLoginSuccess} />
          </>
        } />

        {/* ── Register ── */}
        <Route path="/register" element={
          <>
            <PageMeta title="Registrarme | Kodeo" description="Crea tu cuenta en Kodeo." path="/register" />
            <RegisterPage copy={copy} onNavigate={navigate} />
          </>
        } />

        {/* ── Checkout ── */}
        <Route path="/pago" element={
          <>
            <PageMeta title="Pago | Kodeo" description="Completa tu pago de forma segura." path="/pago" />
            <Checkout
              theme={theme}
              onBack={handleBack}
              onNavigate={navigate}
            />
          </>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
      </Suspense>

      <CookiesBanner
        copy={copy}
        onOpenPolicy={() => navigate('/privacidad')}
      />
    </>
  );
}

function ServicePageRoute({ copy, ...props }) {
  const { slug } = useParams();
  const code    = SLUG_CODES[slug];
  const service = copy.services.list.find(s => s.code === code);
  if (!service) return <Navigate to="/" replace />;

  const titles = {
    '01': ['Landing Page | Kodeo', 'Una página profesional para convertir visitantes en clientes. Desde MX$6,500 · Entrega en 8 días hábiles.', '/landing-page'],
    '02': ['Sitio Web | Kodeo',    'Sitio multipágina que comunica quién eres y qué haces. Desde MX$10,000 · 16 días hábiles.',               '/sitio-web'],
    '03': ['Tienda Online | Kodeo','Plataforma con carrito, catálogo y pasarela de pago. Desde MX$12,000 · 20 días hábiles.',                  '/tienda-online'],
  };
  const [title, desc, path] = titles[code];

  return (
    <>
      <PageMeta title={title} description={desc} path={path} />
      <ServicePage copy={copy} service={service} {...props} />
    </>
  );
}
