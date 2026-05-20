import logoSvg from '../assets/logo_black_transparent.svg';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function Footer({ copy, motionSpeed = 1, onNavigate }) {
  const { isMobile } = useBreakpoint();

  return (
    <footer style={{ background: 'var(--bg-2)', color: 'var(--type)', borderTop: '1px solid var(--line)' }}>

      {/* Columns grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '1.4fr repeat(4, 1fr)',
        gap: isMobile ? '32px 24px' : 36,
        padding: isMobile ? '48px 20px' : '70px 40px',
      }}>
        {/* Brand column — full width on mobile */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src={logoSvg} alt="Kodeo" style={{ height: isMobile ? 52 : 64, filter: 'var(--logo-filter)' }} />
          </a>
          <p
            onClick={() => onNavigate?.(copy.footer.studioDescNav)}
            style={{
              fontFamily: 'var(--body)',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--type-soft)',
              marginTop: 6,
              maxWidth: 320,
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
          >
            {copy.footer.studioDesc}
          </p>
        </div>

        {/* Link columns */}
        {copy.footer.cols.map(([title, items]) => (
          <div key={title}>
            <div style={{
              fontFamily: 'var(--ui)',
              fontSize: 11,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
              marginBottom: 16,
            }}>
              {title}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 11 }}>
              {items.map((item) => {
                const label    = typeof item === 'string' ? item : item.name;
                const href     = typeof item === 'string' ? '#' : item.url;
                const external = href !== '#';
                return (
                  <li key={label}>
                    <a
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      onClick={!external && onNavigate ? (e) => { e.preventDefault(); onNavigate(label); } : undefined}
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: isMobile ? 14 : 15,
                        color: 'var(--type)',
                        display: 'inline-block',
                        transition: `transform ${0.5 / motionSpeed}s cubic-bezier(.2,.7,.2,1)`,
                        cursor: !external && onNavigate ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(6px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '20px 20px' : '24px 40px',
        borderTop: '1px solid var(--line)',
        fontFamily: 'var(--ui)',
        fontSize: 11,
        letterSpacing: '.18em',
        textTransform: 'uppercase',
        color: 'var(--type-soft)',
        gap: isMobile ? 12 : 20,
      }}>
        <span>{copy.footer.legal}</span>
        <span style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {copy.footer.links.map((link) => (
            <a
              key={link}
              href="#"
              onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(link); } : undefined}
              style={{ color: 'var(--type-soft)', cursor: 'pointer' }}
            >
              {link}
            </a>
          ))}
        </span>
        <span>KODEO ✦</span>
      </div>

    </footer>
  );
}
