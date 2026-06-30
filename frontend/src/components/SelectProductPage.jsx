import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { estimatedDeliveryDate, formatDateEs } from '../utils/deliveryDate';
import { trackCtaClick } from '../lib/analytics';

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

function priceToCents(price) {
  return Number(String(price).replace(/[^\d]/g, '')) * 100;
}

export default function SelectProductPage({
  copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick,
  onLogout, user, theme, onThemeToggle,
}) {
  const navigate      = useNavigate();
  const sectionRef    = useRef(null);
  const { isMobile }  = useBreakpoint();
  const sp            = copy.selectProduct;

  useEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0,
        y: 30,
        duration: 0.7 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [motionSpeed]);

  const handleSelect = (svc) => {
    navigate('/agendar', { state: { amount: priceToCents(svc.price), service: svc.name, code: svc.code } });
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onAuthClick={onAuthClick}
        onLogout={onLogout}
        user={user}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />

      <section ref={sectionRef} style={{ padding: isMobile ? '50px 20px 70px' : '80px 36px 110px' }}>
        <div data-reveal style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 18,
        }}>
          {sp.eyebrow}
        </div>
        <h1 data-reveal style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(38px, 10vw, 60px)' : 'clamp(48px, 6vw, 80px)',
          lineHeight: 0.98,
          letterSpacing: '-0.035em',
          margin: '0 0 16px',
          paddingBottom: '0.08em',
        }}>
          {sp.title}
        </h1>
        <p data-reveal style={{
          fontSize: 15,
          color: 'var(--type-soft)',
          maxWidth: 520,
          lineHeight: 1.55,
          margin: '0 0 50px',
        }}>
          {sp.sub}
        </p>

        <div
          data-reveal
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            borderLeft: isMobile ? 'none' : '1px solid var(--line)',
            gap: isMobile ? 16 : 0,
          }}
        >
          {copy.services.list.map((svc) => (
            <ProductCard
              key={svc.code}
              svc={svc}
              accent={ACCENT[svc.code]}
              ctaLabel={sp.cta}
              isMobile={isMobile}
              onSelect={() => handleSelect(svc)}
            />
          ))}
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}

function ProductCard({ svc, accent, ctaLabel, isMobile, onSelect }) {
  return (
    <button
      onClick={onSelect}
      style={{
        borderRight: '1px solid var(--line)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: 0,
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        cursor: 'pointer',
        padding: 0,
        width: '100%',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ height: 3, background: accent, width: '100%' }} />

      <div style={{ padding: isMobile ? '24px 22px' : '28px 28px 32px', flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 10,
          letterSpacing: '.26em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 10,
        }}>
          {svc.code}
        </div>

        <div style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(26px, 7vw, 38px)' : 'clamp(26px, 2.6vw, 38px)',
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          marginBottom: 16,
          paddingBottom: '0.06em',
          color: 'var(--type)',
        }}>
          {svc.name}
        </div>

        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--type-soft)',
          margin: '0 0 24px',
        }}>
          {svc.lead}
        </p>

        <div style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(28px, 8vw, 42px)' : 'clamp(30px, 3vw, 42px)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          paddingBottom: '0.06em',
          marginBottom: 6,
          color: 'var(--type)',
        }}>
          {svc.price}
        </div>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 10,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 6,
        }}>
          {svc.time}
        </div>
        <div style={{
          fontFamily: 'var(--body)',
          fontSize: 12,
          color: 'var(--type-muted)',
          marginBottom: 28,
        }}>
          Entrega estimada: {formatDateEs(estimatedDeliveryDate(svc.time))}
        </div>

        <div style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-pill)',
          padding: '13px 18px',
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--type)',
        }}>
          {ctaLabel}
          <span style={{ color: accent }}>→</span>
        </div>
      </div>
    </button>
  );
}
