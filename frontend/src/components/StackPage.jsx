import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function StackPage({ copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick, onLogout, user, theme, onThemeToggle }) {
  const heroRef  = useRef(null);
  const gridRef  = useRef(null);
  const sp       = copy.stackPricing;
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.from(heroRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0,
        y: 40,
        duration: 0.8 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
      gsap.from(gridRef.current.querySelectorAll('[data-card]'), {
        opacity: 0,
        y: 36,
        duration: 0.65 / motionSpeed,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.28 / motionSpeed,
      });
    });
    return () => ctx.revert();
  }, [motionSpeed]);

  const total = sp.stack.reduce((s, c) => s + c.items.length, 0);

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

      {/* HERO */}
      <section
        ref={heroRef}
        style={{
          padding: isMobile ? '48px 20px 52px' : '70px 40px 80px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div data-reveal style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 24,
        }}>
          {sp.eyebrow}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 14 : 28, flexWrap: 'wrap' }}>
          <h1 data-reveal style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 'clamp(52px, 14vw, 100px)' : 'clamp(72px, 12vw, 160px)',
            lineHeight: 0.9,
            margin: 0,
            letterSpacing: '-0.04em',
            paddingBottom: '0.08em',
          }}>
            {sp.stackTitle}
          </h1>
          <span data-reveal style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
          }}>
            {total} tecnologías
          </span>
        </div>
      </section>

      {/* GRID */}
      <section style={{ padding: isMobile ? '40px 20px 72px' : '80px 40px 120px' }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            border: '1px solid var(--line)',
            borderRadius: isMobile ? 'var(--radius)' : 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {sp.stack.map((cat) => (
            <div
              key={cat.label}
              data-card
              style={{
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                padding: isMobile ? '20px 16px 24px' : '36px 32px 40px',
              }}
            >
              <div style={{
                fontFamily: 'var(--ui)',
                fontSize: 10,
                letterSpacing: '.28em',
                textTransform: 'uppercase',
                color: 'var(--type-soft)',
                marginBottom: isMobile ? 16 : 28,
              }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
                {cat.items.map((tech) => (
                  <span key={tech} style={{
                    fontFamily: 'var(--display)',
                    fontSize: isMobile ? 'clamp(18px, 5vw, 28px)' : 'clamp(28px, 3vw, 40px)',
                    fontWeight: 400,
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                    paddingBottom: '0.04em',
                    color: 'var(--type)',
                    transition: 'color 0.2s',
                    cursor: 'default',
                  }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
