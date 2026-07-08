import { useLocation } from 'react-router-dom';
import Nav from './Nav';
import { useBreakpoint } from '../hooks/useBreakpoint';

const DESKTOP_NAV_H = 84;
const MOBILE_NAV_H  = 60;

function Avatar({ name }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: 'var(--bg-3)', border: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.01em',
      color: 'var(--type)',
    }}>
      {initial}
    </div>
  );
}

function SidebarLink({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'center',
        justifyContent: 'space-between', padding: '11px 20px',
        background: active ? 'var(--bg-3)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--type)' : '2px solid transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
        fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: active ? 'var(--type)' : 'var(--type-muted)',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-3)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
      {active && <span style={{ fontSize: 10, color: 'var(--type-soft)' }}>→</span>}
    </button>
  );
}

function PortalSidebar({ user, onNavigate, onLogout }) {
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'administrador';

  const links = isAdmin ? [
    { label: 'Pedidos',    href: '/pedidos'    },
    { label: 'Citas',      href: '/citas'      },
    { label: 'Analíticas', href: '/analiticas' },
    { label: 'Usuarios',   href: '/usuarios'   },
    { label: 'Cuenta',     href: '/cuenta'     },
  ] : [
    { label: 'Pedidos',    href: '/pedidos'    },
    { label: 'Citas',      href: '/citas'      },
    { label: 'Analíticas', href: '/analiticas' },
    { label: 'Cuenta',     href: '/cuenta'     },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: DESKTOP_NAV_H,
      height: `calc(100vh - ${DESKTOP_NAV_H}px)`,
      overflowY: 'auto',
      background: 'var(--bg)',
    }}>
      {/* User info */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isAdmin ? 10 : 0 }}>
          <Avatar name={user?.name || user?.username} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--type)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || user?.username}
            </div>
            <div style={{
              fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)',
              marginTop: 2, letterSpacing: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.email}
            </div>
          </div>
        </div>
        {isAdmin && (
          <span style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em',
            textTransform: 'uppercase', color: '#5170ff',
            border: '1px solid #5170ff44', background: '#5170ff12',
            borderRadius: 'var(--radius-pill)', padding: '3px 9px',
            display: 'inline-block',
          }}>
            Administrador
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 0' }}>
        {links.map(({ label, href }) => (
          <SidebarLink
            key={href}
            label={label}
            active={pathname === href}
            onClick={() => onNavigate(href)}
          />
        ))}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', width: '100%', alignItems: 'center',
            justifyContent: 'space-between', padding: '9px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em',
            textTransform: 'uppercase', color: '#e05050',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Cerrar sesión
          <span style={{ fontSize: 10 }}>→</span>
        </button>
      </div>
    </aside>
  );
}

function IconOrders() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M9 9h6M9 12h6M9 15h4"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18M8 20V12M12 20V5M16 20v-8"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconPerson() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M3 10h18M8 3v4M16 3v4"/>
    </svg>
  );
}

const BOTTOM_NAV_H = 64;

function MobileBottomNav({ user, onNavigate }) {
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'administrador';

  const tabs = isAdmin ? [
    { label: 'Pedidos',    href: '/pedidos',    Icon: IconOrders    },
    { label: 'Citas',      href: '/citas',      Icon: IconCalendar  },
    { label: 'Analíticas', href: '/analiticas', Icon: IconChart     },
    { label: 'Usuarios',   href: '/usuarios',   Icon: IconUsers     },
    { label: 'Cuenta',     href: '/cuenta',     Icon: IconPerson    },
  ] : [
    { label: 'Pedidos',    href: '/pedidos',    Icon: IconOrders    },
    { label: 'Citas',      href: '/citas',      Icon: IconCalendar  },
    { label: 'Analíticas', href: '/analiticas', Icon: IconChart     },
    { label: 'Cuenta',     href: '/cuenta',     Icon: IconPerson    },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bg)', borderTop: '1px solid var(--line)',
      display: 'flex', height: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(({ label, href, Icon }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => onNavigate(href)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? 'var(--type)' : 'var(--type-muted)',
              padding: '8px 4px',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 2, background: 'var(--type)', borderRadius: '0 0 2px 2px',
              }} />
            )}
            <Icon />
            <span style={{
              fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.1em',
              textTransform: 'uppercase', lineHeight: 1,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function PortalLayout({ user, onNavigate, onLogout, copy, theme, onThemeToggle, children }) {
  const { isMobile } = useBreakpoint();

  const navProps = {
    copy, theme, onThemeToggle, user, onLogout,
    onLogoClick:    () => onNavigate('/'),
    onAuthClick:    (route) => onNavigate(`/${route}`),
    onNavItemClick: () => onNavigate('/'),
    onContact:      () => onNavigate('/'),
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav {...navProps} />

      {isMobile ? (
        <>
          <div style={{ paddingBottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))` }}>
            {children}
          </div>
          <MobileBottomNav user={user} onNavigate={onNavigate} />
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <PortalSidebar user={user} onNavigate={onNavigate} onLogout={onLogout} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
