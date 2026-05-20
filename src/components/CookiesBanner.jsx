import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kodeo_cookies_consent';

export default function CookiesBanner({ copy, onOpenPolicy }) {
  const [visible, setVisible] = useState(false);
  const c = copy.legal.cookies;

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'min(560px, calc(100vw - 32px))',
      background: 'var(--bg-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 18,
          letterSpacing: '-0.01em',
          marginBottom: 8,
          color: 'var(--type)',
        }}>
          {c.title}
        </div>
        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--type-soft)',
          margin: 0,
        }}>
          {c.body}{' '}
          <button
            onClick={onOpenPolicy}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--type)',
              fontFamily: 'var(--body)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {c.learnMore}
          </button>
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={decline}
          style={{
            background: 'none',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-pill)',
            padding: '10px 20px',
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--type-soft)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
        >
          {c.decline}
        </button>
        <button
          onClick={accept}
          style={{
            background: 'var(--type)',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-pill)',
            padding: '10px 20px',
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--bg)',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {c.accept}
        </button>
      </div>
    </div>
  );
}
