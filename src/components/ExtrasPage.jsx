import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';

gsap.registerPlugin(ScrollTrigger);

const PLAN_ACCENT = ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-yellow)'];

export default function ExtrasPage({
  copy, motionSpeed = 1,
  onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onExtrasClick,
}) {
  const ep           = copy.extrasPage;
  const heroRef      = useRef(null);
  const plansRef     = useRef(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    window.scrollTo(0, 0);

    const ctx = gsap.context(() => {
      gsap.from(heroRef.current.querySelectorAll('[data-r]'), {
        opacity: 0, y: 40,
        duration: 0.8 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.05,
      });

      gsap.from(plansRef.current.querySelectorAll('[data-r]'), {
        scrollTrigger: { trigger: plansRef.current, start: 'top 78%' },
        opacity: 0, y: 36,
        duration: 0.7 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
    });

    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onExtrasClick={onExtrasClick}
      />

      {/* ── Hero ── */}
      <div ref={heroRef} style={{ padding: isMobile ? '50px 20px 52px' : '80px 40px 72px', borderBottom: '1px solid var(--line)' }}>
        <div data-r style={{
          fontFamily: 'var(--ui)', fontSize: 11,
          letterSpacing: '.22em', textTransform: 'uppercase',
          color: 'var(--type-soft)', marginBottom: 20,
        }}>
          {ep.eyebrow}
        </div>
        <h1 data-r style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: 'clamp(52px, 7vw, 96px)',
          lineHeight: 0.93, letterSpacing: '-0.04em',
          margin: '0 0 36px', paddingBottom: '0.06em',
          whiteSpace: 'pre-line', maxWidth: 900,
        }}>
          {ep.title}
        </h1>
        <p data-r style={{
          fontFamily: 'var(--body)', fontSize: 16,
          lineHeight: 1.7, color: 'var(--type-soft)',
          maxWidth: 580, margin: 0,
        }}>
          {ep.intro}
        </p>
      </div>

      {/* ── Plans ── */}
      <div ref={plansRef} style={{ padding: isMobile ? '48px 20px 80px' : '80px 40px 120px' }}>
        <div data-r style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          borderLeft: isMobile ? 'none' : '1px solid var(--line)',
          gap: isMobile ? 16 : 0,
        }}>
          {ep.plans.map((plan, i) => (
            <div key={plan.name} style={{
              borderRight: '1px solid var(--line)',
              borderTop: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ height: 3, background: PLAN_ACCENT[i] }} />
              <div style={{ padding: '28px 28px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                <div style={{
                  fontFamily: 'var(--ui)', fontSize: 10,
                  letterSpacing: '.26em', textTransform: 'uppercase',
                  color: 'var(--type-soft)', marginBottom: 10,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{
                  fontFamily: 'var(--display)', fontWeight: 400,
                  fontSize: 'clamp(22px, 6vw, 34px)',
                  lineHeight: 1.05, letterSpacing: '-0.025em',
                  marginBottom: 20, paddingBottom: '0.06em',
                }}>
                  {plan.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'var(--display)', fontWeight: 400,
                    fontSize: 'clamp(26px, 7vw, 40px)',
                    lineHeight: 1, letterSpacing: '-0.03em', paddingBottom: '0.06em',
                  }}>
                    {plan.price}
                  </span>
                  <span style={{
                    fontFamily: 'var(--ui)', fontSize: 11,
                    letterSpacing: '.1em', color: 'var(--type-soft)',
                  }}>
                    {plan.period}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', margin: '20px 0' }} />

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.includes.map((item) => (
                    <li key={item} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      fontFamily: 'var(--body)', fontSize: 13,
                      lineHeight: 1.45, color: 'var(--type-soft)',
                    }}>
                      <span style={{ color: PLAN_ACCENT[i], flexShrink: 0, marginTop: 1 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onContact}
                  style={{
                    marginTop: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'transparent',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
                    padding: '13px 18px',
                    fontFamily: 'var(--ui)', fontSize: 11,
                    letterSpacing: '.18em', textTransform: 'uppercase',
                    color: 'var(--type)', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = PLAN_ACCENT[i];
                    e.currentTarget.style.background  = 'var(--bg-3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.background  = 'transparent';
                  }}
                >
                  {ep.ctaLabel}
                  <span style={{ color: PLAN_ACCENT[i] }}>↗</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
