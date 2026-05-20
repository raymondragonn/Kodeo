import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMagneticCursor } from '../hooks/useMagneticCursor';
import { useBreakpoint } from '../hooks/useBreakpoint';

gsap.registerPlugin(ScrollTrigger);

export default function CtaSection({ copy, motionSpeed = 1 }) {
  const sectionRef   = useRef(null);
  const emailRef     = useMagneticCursor(80, 0.4);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('[data-reveal]'), {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        opacity: 0,
        y: 40,
        duration: 0.9 / motionSpeed,
        stagger: 0.15,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <section
      ref={sectionRef}
      id="contact"
      style={{
        position: 'relative',
        padding: isMobile ? '80px 20px 70px' : '140px 40px 130px',
        borderTop: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(60% 60% at 50% 100%, var(--glow), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div
          data-reveal
          style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
            marginBottom: 30,
          }}
        >
          {copy.cta.label}
        </div>

        <h2
          data-reveal
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 'clamp(44px, 13vw, 80px)' : 'clamp(52px, 9vw, 130px)',
            lineHeight: 0.92,
            margin: 0,
            letterSpacing: '-0.035em',
            paddingBottom: '0.1em',
          }}
        >
          <span style={{ display: 'block' }}>{copy.cta.heading[0]}</span>
          <span style={{ display: 'block', color: 'var(--type-soft)' }}>{copy.cta.heading[1]}</span>
        </h2>

        <div
          data-reveal
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-end',
            marginTop: isMobile ? 40 : 70,
            gap: isMobile ? 20 : 30,
          }}
        >
          <a
            ref={emailRef}
            href={`mailto:${copy.cta.email}`}
            style={{
              fontFamily: 'var(--display)',
              fontSize: isMobile ? 'clamp(22px, 6vw, 36px)' : 'clamp(32px, 4.5vw, 56px)',
              letterSpacing: '-0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--type)',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              wordBreak: 'break-all',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {copy.cta.email}
            <span style={{
              width: isMobile ? 44 : 56,
              height: isMobile ? 44 : 56,
              borderRadius: '50%',
              background: 'var(--type)',
              color: 'var(--bg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? 18 : 22,
              flexShrink: 0,
            }}>
              ↗
            </span>
          </a>

          <a
            href={`https://wa.me/5212298493706?text=${encodeURIComponent(copy.cta.waMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'var(--type)',
              color: 'var(--bg)',
              padding: isMobile ? '18px 28px' : '22px 32px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)',
              fontSize: 12,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, opacity 0.25s',
              width: isMobile ? '100%' : 'auto',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {copy.cta.btn} →
          </a>
        </div>
      </div>
    </section>
  );
}
