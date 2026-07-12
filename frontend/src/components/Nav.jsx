import { useState, useRef, useEffect } from 'react';
import logoSvg from '../assets/logo_black_transparent.svg';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLang, toggleLang } from '../lib/lang';

const SERVICES_LABELS = new Set(['Servicios', 'Services']);

function HamburgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ display: 'block' }}>
      <line x1="3" y1="6.5" x2="17" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '10px 6.5px', transform: open ? 'rotate(45deg) translateY(3.5px)' : 'none', transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)' }} />
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        style={{ opacity: open ? 0 : 1, transition: 'opacity 0.18s ease' }} />
      <line x1="3" y1="13.5" x2="17" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '10px 13.5px', transform: open ? 'rotate(-45deg) translateY(-3.5px)' : 'none', transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

function LangToggle({ style = {} }) {
  const lang = useLang();
  return (
    <button
      onClick={toggleLang}
      aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--type-soft)',
        height: 36,
        padding: '0 10px',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexShrink: 0,
        fontFamily: 'var(--ui)',
        fontSize: 11,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        transition: 'border-color 0.2s, color 0.2s, background 0.2s',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--line-2)';
        e.currentTarget.style.color = 'var(--type)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--type-soft)';
      }}
    >
      {/* Globe icon */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
      </svg>
      {lang.toUpperCase()}
    </button>
  );
}

function ThemeToggle({ theme, onThemeToggle, style = {} }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onThemeToggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--type-soft)',
        width: 36,
        height: 36,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.2s, color 0.2s, background 0.2s',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--line-2)';
        e.currentTarget.style.color = 'var(--type)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--type-soft)';
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2"  x2="12" y2="5"  />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="4.22" y1="4.22"  x2="6.34" y2="6.34"  />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
          <line x1="2"  y1="12" x2="5"  y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" />
          <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  />
        </svg>
      ) : (
        /* Moon icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function Nav({ copy, onContact, onLogoClick, onNavItemClick, onServiceClick, onAuthClick, onLogout, user, theme, onThemeToggle }) {
  const [pinnedItem,  setPinnedItem]    = useState(null);
  const [menuOpen,    setMenuOpen]      = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const dropdownRef   = useRef(null);
  const profileRef    = useRef(null);
  const { isMobile }  = useBreakpoint();

  // Close pinned dropdown on outside click (desktop)
  useEffect(() => {
    if (!pinnedItem) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPinnedItem(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pinnedItem]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Keep the overlay from surviving a switch back to the desktop layout.
  useEffect(() => {
    if (isMobile) return undefined;
    const id = window.requestAnimationFrame(() => setMenuOpen(false));
    return () => window.cancelAnimationFrame(id);
  }, [isMobile]);

  // Escape closes the mobile navigation and returns focus to normal content.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const handleMobileNav = (fn) => {
    setMenuOpen(false);
    setTimeout(fn, 60);
  };

  /* ── MOBILE ────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--line)',
          minHeight: 60,
        }}>
          <a
            href="#"
            onClick={e => { e.preventDefault(); onLogoClick?.(); setMenuOpen(false); }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img src={logoSvg} alt="Kodeo" style={{ height: 50, filter: 'var(--logo-filter)' }} />
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LangToggle />
            <ThemeToggle theme={theme} onThemeToggle={onThemeToggle} />
            <button
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--type)',
                width: 44, height: 44,
                borderRadius: 'var(--radius)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s, border-color 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <HamburgerIcon open={false} />
            </button>
          </div>
        </header>

        {/* Full-screen mobile menu */}
        {menuOpen && (
          <div id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navegación principal" style={{
            position: 'fixed', top: 60, left: 0, right: 0, bottom: 0,
            zIndex: 99, background: 'var(--bg)', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--line)',
          }}>

            {/* El menú público no cambia con el estado de la sesión. */}
              <>
                {/* Acceso: perfil activo o acciones para visitantes */}
                <div style={{ padding: '20px 20px 0' }}>
                  {user ? (
                    <button
                      onClick={() => { setMenuOpen(false); onAuthClick?.('proyectos'); }}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', gap: 12,
                        padding: '0 0 20px', border: 0, borderBottom: '1px solid var(--line)',
                        background: 'transparent', color: 'var(--type)', textAlign: 'left',
                        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-3)', border: '1px solid var(--line)',
                      }}>
                        <ProfileIcon />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{
                          display: 'block', fontFamily: 'var(--ui)', fontSize: 11,
                          letterSpacing: '.12em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {user.name || user.username}
                        </span>
                        <span style={{
                          display: 'block', marginTop: 3, fontFamily: 'var(--body)',
                          fontSize: 11, color: 'var(--type-muted)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {user.email}
                        </span>
                      </span>
                      <span style={{ fontSize: 16, color: 'var(--type-soft)' }}>→</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
                      {[
                        { label: copy.authLogin ?? 'Iniciar sesión', route: 'login', primary: true },
                        { label: copy.authRegister ?? 'Registrarme', route: 'register', primary: false },
                      ].map(({ label, route, primary }) => (
                      <button
                        key={route}
                        onClick={() => { setMenuOpen(false); onAuthClick?.(route); }}
                        style={{
                          flex: 1, padding: '13px 10px',
                          background: primary ? 'var(--type)' : 'transparent',
                          color: primary ? 'var(--bg)' : 'var(--type)',
                          border: primary ? 'none' : '1px solid var(--line)',
                          borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                          textTransform: 'uppercase',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {label}
                      </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links de navegación landing */}
                <nav style={{ flex: 1, padding: '0 20px' }}>
                  {copy.nav.map((n) => (
                    <a
                      key={n}
                      href="#"
                      onClick={e => { e.preventDefault(); handleMobileNav(() => onNavItemClick?.(n)); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '22px 0', borderBottom: '1px solid var(--line)',
                        fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.02em',
                        color: 'var(--type)', textDecoration: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {n}
                      <span style={{ color: 'var(--type-soft)', fontSize: 18 }}>→</span>
                    </a>
                  ))}
                </nav>

                <div style={{
                  padding: '20px 20px 36px', marginTop: 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
                    © Kodeo {new Date().getFullYear()}
                  </span>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
                    Veracruz, MX
                  </span>
                </div>
              </>
          </div>
        )}
      </>
    );
  }

  /* ── DESKTOP ────────────────────────────────────────────── */
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 40px',
      fontFamily: 'var(--ui)',
      fontSize: 12,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: 'var(--type-soft)',
      borderBottom: '1px solid var(--line)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    }}>
      <a
        href="#"
        onClick={e => { e.preventDefault(); onLogoClick?.(); }}
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      >
        <img src={logoSvg} alt="Kodeo" style={{ height: 68, filter: 'var(--logo-filter)' }} />
      </a>

      <nav style={{ display: 'flex', gap: 26 }}>
        {copy.nav.map((n) => {
          const isServices    = SERVICES_LABELS.has(n) && !!onServiceClick;
          const open          = pinnedItem === n;

          return (
            <div
              key={n}
              ref={isServices ? dropdownRef : null}
              style={{ position: 'relative' }}
            >
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (isServices) {
                    setPinnedItem(prev => prev === n ? null : n);
                  } else {
                    onNavItemClick?.(n);
                  }
                }}
                style={{
                  color: open ? 'var(--type)' : 'var(--type-soft)',
                  transition: 'color 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {n}
                {isServices && (
                  <span style={{
                    fontSize: 8,
                    opacity: open ? 1 : 0.5,
                    transition: 'opacity 0.2s, transform 0.2s',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                  }}>
                    ▾
                  </span>
                )}
              </a>

              {isServices && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 18px)',
                  left: '50%',
                  width: 260,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.28)',
                  overflow: 'hidden',
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  transform: open
                    ? 'translateX(-50%) translateY(0)'
                    : 'translateX(-50%) translateY(-6px)',
                  zIndex: 50,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -5,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 9,
                    height: 9,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    borderBottom: 'none',
                    borderRight: 'none',
                  }} />

                  {copy.services.list.map((svc) => (
                    <button
                      key={svc.code}
                      onClick={() => {
                        setPinnedItem(null);
                        onServiceClick(svc.code);
                      }}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: 10,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{
                          fontFamily: 'var(--ui)',
                          fontSize: 11,
                          letterSpacing: '.14em',
                          textTransform: 'uppercase',
                          color: 'var(--type)',
                          marginBottom: 3,
                        }}>
                          {svc.name}
                        </div>
                        <div style={{
                          fontFamily: 'var(--body)',
                          fontSize: 11,
                          letterSpacing: '0',
                          textTransform: 'none',
                          color: 'var(--type-soft)',
                          lineHeight: 1.4,
                        }}>
                          {svc.lead}
                        </div>
                      </div>
                      <span style={{ color: 'var(--type-soft)', fontSize: 13, flexShrink: 0 }}>↗</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 8px var(--accent-green)',
          }} />
          {copy.navAvailable}
        </span>
        <ThemeToggle theme={theme} onThemeToggle={onThemeToggle} />
        <LangToggle />

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(p => !p)}
            aria-label="Cuenta"
            style={{
              background: profileOpen ? 'var(--bg-3)' : 'transparent',
              border: '1px solid var(--line)',
              color: user ? 'var(--type)' : 'var(--type-soft)',
              height: 36,
              padding: user ? '0 12px 0 10px' : '0',
              width: user ? 'auto' : 36,
              borderRadius: user ? 'var(--radius-pill)' : 'var(--radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexShrink: 0,
              transition: 'border-color 0.2s, color 0.2s, background 0.2s',
              justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = user ? 'var(--type)' : 'var(--type-soft)'; }}
          >
            <ProfileIcon />
            {user && (
              <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                {user.username}
              </span>
            )}
          </button>

          <div style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: 220,
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.28)',
            overflow: 'hidden',
            opacity: profileOpen ? 1 : 0,
            pointerEvents: profileOpen ? 'auto' : 'none',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
            transform: profileOpen ? 'translateY(0)' : 'translateY(-6px)',
            zIndex: 50,
          }}>
            <div style={{
              position: 'absolute', top: -5, right: 14,
              width: 9, height: 9,
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderBottom: 'none', borderRight: 'none',
              transform: 'rotate(45deg)',
            }} />

            {user ? (
              <>
                <div style={{
                  padding: '14px 18px 12px',
                  borderBottom: '1px solid var(--line)',
                }}>
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type)', marginBottom: 2 }}>
                    {user.name}
                  </div>
                  <div style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', letterSpacing: 0, textTransform: 'none' }}>
                    {user.email}
                  </div>
                </div>

                {[
                  { label: 'Panel', route: '/citas' },
                ].map(({ label, route }) => (
                  <button
                    key={route}
                    onClick={() => { setProfileOpen(false); onAuthClick?.(route.slice(1)); }}
                    style={{
                      display: 'flex', width: '100%', alignItems: 'center',
                      justifyContent: 'space-between', padding: '13px 18px',
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--line)', cursor: 'pointer',
                      textAlign: 'left', transition: 'background 0.15s',
                      fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                      textTransform: 'uppercase', color: 'var(--type)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {label}
                    <span style={{ color: 'var(--type-soft)', fontSize: 13 }}>→</span>
                  </button>
                ))}

                <button
                  onClick={() => { setProfileOpen(false); onLogout?.(); }}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center',
                    justifyContent: 'space-between', padding: '13px 18px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: '#e05050',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cerrar sesión
                  <span style={{ fontSize: 13 }}>→</span>
                </button>
              </>
            ) : (
              [
                { label: copy.authLogin ?? 'Iniciar sesión', route: 'login' },
                { label: copy.authRegister ?? 'Registrarme',  route: 'register' },
              ].map(({ label, route }) => (
                <button
                  key={route}
                  onClick={() => { setProfileOpen(false); onAuthClick?.(route); }}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center',
                    justifyContent: 'space-between', padding: '14px 18px',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: 'var(--type)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {label}
                  <span style={{ color: 'var(--type-soft)', fontSize: 13 }}>→</span>
                </button>
              ))
            )}
          </div>
        </div>

        <button
          onClick={onContact}
          style={{
            background: 'var(--type)',
            color: 'var(--bg)',
            border: 0,
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {copy.navContactBtn} →
        </button>
      </div>
    </header>
  );
}
