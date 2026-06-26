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
    { label: 'Analíticas', href: '/analiticas' },
    { label: 'Usuarios',   href: '/usuarios'   },
    { label: 'Mi cuenta',  href: '/cuenta'     },
  ] : [
    { label: 'Mis pedidos',  href: '/pedidos'    },
    { label: 'Mis analíticas', href: '/analiticas' },
    { label: 'Mi cuenta',    href: '/cuenta'     },
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

function MobileTabs({ user, onNavigate }) {
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'administrador';

  const tabs = isAdmin ? [
    { label: 'Pedidos',    href: '/pedidos'    },
    { label: 'Analíticas', href: '/analiticas' },
    { label: 'Usuarios',   href: '/usuarios'   },
    { label: 'Cuenta',     href: '/cuenta'     },
  ] : [
    { label: 'Mis pedidos', href: '/pedidos' },
    { label: 'Cuenta',      href: '/cuenta'  },
  ];

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '10px 16px',
      borderBottom: '1px solid var(--line)', background: 'var(--bg)',
      position: 'sticky', top: MOBILE_NAV_H, zIndex: 20,
      overflowX: 'auto', scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {tabs.map(({ label, href }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => onNavigate(href)}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              background: active ? 'var(--type)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--type-muted)',
              border: active ? 'none' : '1px solid var(--line)',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em',
              textTransform: 'uppercase',
              transition: 'background 0.15s, color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
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
          <MobileTabs user={user} onNavigate={onNavigate} />
          {children}
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
