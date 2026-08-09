import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';

const STEP_COLORS = ['#FFDE59', '#63C44D', '#FF3131', '#5170FF'];

export default function MethodologyPage({ copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick, onLogout, user, theme, onThemeToggle }) {
  const heroRef   = useRef(null);
  const stepsRef  = useRef([]);
  const m         = copy.methodology;
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
      gsap.from(stepsRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.7 / motionSpeed,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3 / motionSpeed,
      });
    });
    return () => ctx.revert();
  }, [motionSpeed]);

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
          {m.eyebrow}
        </div>

        <h1 data-reveal style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(52px, 14vw, 100px)' : 'clamp(72px, 12vw, 160px)',
          lineHeight: 0.9,
          margin: 0,
          letterSpacing: '-0.04em',
          paddingBottom: '0.08em',
        }}>
          {m.heading.map((line, i) => (
            <span key={i} style={{ display: 'block', color: i === 1 ? 'var(--type-soft)' : 'var(--type)' }}>
              {line}
            </span>
          ))}
        </h1>

        <p data-reveal style={{
          fontFamily: 'var(--ui)',
          fontSize: 12,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          margin: '32px 0 0',
        }}>
          {m.sub}
        </p>
      </section>

      {/* STEPS */}
      <section style={{ padding: isMobile ? '40px 20px 72px' : '80px 40px 120px' }}>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: isMobile ? 32 : 60,
        }}>
          {m.stepsLabel}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: 2,
        }}>
          {copy.process.map((step, i) => {
            const color = STEP_COLORS[i % STEP_COLORS.length];
            return (
              <div
                key={step.name}
                ref={el => stepsRef.current[i] = el}
                style={{
                  padding: isMobile ? '28px 20px 32px' : '52px 44px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--bg)',
                  transition: 'background 0.35s ease',
                }}
                onMouseEnter={e => !isMobile && (e.currentTarget.style.background = `${color}0D`)}
                onMouseLeave={e => !isMobile && (e.currentTarget.style.background = 'var(--bg)')}
              >
                {/* Step number + dot */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: isMobile ? 24 : 40,
                }}>
                  <span style={{
                    fontFamily: 'var(--display)',
                    fontSize: isMobile ? 'clamp(56px, 18vw, 100px)' : 'clamp(80px, 10vw, 130px)',
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                    color: color,
                    userSelect: 'none',
                  }}>
                    0{i + 1}
                  </span>
                  <span style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 14px ${color}`,
                    marginTop: 8,
                    flexShrink: 0,
                  }} />
                </div>

                {/* Step name — encabezado real: son las cuatro fases del proceso */}
                <h2 style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  fontSize: isMobile ? 'clamp(26px, 8vw, 44px)' : 'clamp(36px, 4vw, 52px)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                  margin: 0,
                  marginBottom: 16,
                  paddingBottom: '0.06em',
                }}>
                  {step.name}
                </h2>

                {/* Divider */}
                <div style={{
                  width: '100%',
                  height: 1,
                  background: color,
                  opacity: 0.4,
                  marginBottom: 16,
                }} />

                {/* Description */}
                <p style={{
                  fontFamily: 'var(--body)',
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'var(--type-soft)',
                  margin: 0,
                }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
