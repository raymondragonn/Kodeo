import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function Hero({ copy, motionSpeed = 1 }) {
  const linesRef    = useRef([]);
  const subRef      = useRef(null);
  const ctaRef      = useRef(null);
  const eyebrowRef  = useRef(null);
  const sectionRef  = useRef(null);
  const { isMobile } = useBreakpoint();

  const dur     = 0.9 / motionSpeed;
  const stagger = 0.12 / motionSpeed;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(eyebrowRef.current, { opacity: 0, y: 10, duration: dur * 0.6 });
      tl.from(
        linesRef.current,
        { y: '115%', duration: dur, stagger },
        '-=0.2'
      );
      tl.from(
        [subRef.current, ctaRef.current],
        { opacity: 0, y: 20, duration: dur * 0.7, stagger: 0.1 },
        '-=0.3'
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [copy.hero.lines, motionSpeed]);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: isMobile ? '24px 20px 70px' : '40px 40px 100px',
        position: 'relative',
      }}
    >
      {/* Eyebrow */}
      <div
        ref={eyebrowRef}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: isMobile ? 32 : 50,
        }}
      >
        <span>{copy.hero.eyebrow}</span>
      </div>

      {/* Headline */}
      <h1
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(38px, 11vw, 80px)' : 'clamp(64px, 10vw, 140px)',
          lineHeight: 0.92,
          letterSpacing: '-0.035em',
          margin: 0,
          paddingBottom: '0.12em',
        }}
      >
        {copy.hero.lines.map((line, i) => (
          <div key={i} style={{ overflow: 'hidden', display: 'block', lineHeight: 'inherit', paddingBottom: '0.22em', marginBottom: '-0.22em' }}>
            <span
              ref={(el) => (linesRef.current[i] = el)}
              style={{
                display: 'block',
                textIndent: i === 2 ? (isMobile ? 0 : 'clamp(40px, 6vw, 100px)') : 0,
                color: i === 1 ? 'var(--type-soft)' : 'var(--type)',
              }}
            >
              {line}
            </span>
          </div>
        ))}
      </h1>

      {/* Sub + CTAs */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          marginTop: isMobile ? 36 : 70,
          gap: isMobile ? 24 : 40,
        }}
      >
        <p
          ref={subRef}
          style={{
            maxWidth: 380,
            lineHeight: 1.6,
            fontSize: 14,
            color: 'var(--type-soft)',
            margin: 0,
          }}
        >
          {copy.hero.sub}
        </p>

        <div ref={ctaRef} style={{ display: 'flex', gap: 12, alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          <a
            href={`https://wa.me/5212298493706?text=${encodeURIComponent(copy.cta.waMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'var(--type)',
              color: 'var(--bg)',
              padding: isMobile ? '16px 22px' : '16px 26px',
              fontFamily: 'var(--ui)',
              fontSize: 12,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, opacity 0.25s',
              flex: isMobile ? 1 : 'none',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {copy.hero.ctaA}
          </a>
          <a
            href="#work"
            style={{
              fontFamily: 'var(--ui)',
              fontSize: 12,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
              padding: isMobile ? '16px 16px' : '16px 18px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--line-2)';
              e.currentTarget.style.color = 'var(--type)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.color = 'var(--type-soft)';
            }}
          >
            {copy.hero.ctaB}
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: isMobile ? 20 : 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--type-soft)',
        fontFamily: 'var(--ui)',
        fontSize: 10,
        letterSpacing: '.24em',
        textTransform: 'uppercase',
      }}>
        <span style={{
          width: 36,
          height: 1,
          background: 'var(--line-2)',
          position: 'relative',
          overflow: 'hidden',
          display: 'inline-block',
        }}>
          <span style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--type)',
            animation: `scrollline ${3 / motionSpeed}s ease-in-out infinite`,
          }} />
        </span>
        {copy.hero.scroll}
      </div>
    </section>
  );
}
