import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBreakpoint } from '../hooks/useBreakpoint';

gsap.registerPlugin(ScrollTrigger);

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

export default function StackPricing({ copy, motionSpeed = 1, onServiceClick }) {
  const sectionRef   = useRef(null);
  const headRef      = useRef(null);
  const pricingRef   = useRef(null);
  const stackRef     = useRef(null);
  const { isMobile } = useBreakpoint();

  const sp = copy.stackPricing;
  const services = copy.services.list;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from([headRef.current, pricingRef.current, stackRef.current], {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
        opacity: 0,
        y: 36,
        duration: 0.75 / motionSpeed,
        stagger: 0.14,
        ease: 'power3.out',
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        padding: isMobile ? '60px 20px' : '100px 40px',
      }}
    >
      {/* ── Header ── */}
      <div ref={headRef} style={{ marginBottom: 60 }}>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 14,
        }}>
          {sp.eyebrow}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 14 : 32, flexWrap: 'wrap' }}>
          <h2 style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 'clamp(40px, 11vw, 72px)' : 'clamp(48px, 6vw, 80px)',
            lineHeight: 0.94,
            letterSpacing: '-0.035em',
            margin: 0,
            paddingBottom: '0.06em',
          }}>
            {sp.pricingTitle}
          </h2>
          <span style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--type-muted)',
          }}>
            {sp.pricingNote}
          </span>
        </div>
      </div>

      {/* ── Pricing grid ── */}
      <div
        ref={pricingRef}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          borderLeft: isMobile ? 'none' : '1px solid var(--line)',
          borderRadius: isMobile ? 0 : 'var(--radius-lg)',
          overflow: isMobile ? 'visible' : 'hidden',
          gap: isMobile ? 16 : 0,
          marginBottom: isMobile ? 48 : 80,
        }}
      >
        {services.map((svc) => (
          <PricingCard
            key={svc.code}
            svc={svc}
            accent={ACCENT[svc.code]}
            ctaLabel={sp.ctaLabel}
            maxIncludes={sp.maxIncludes}
            motionSpeed={motionSpeed}
            isMobile={isMobile}
            onServiceClick={onServiceClick}
          />
        ))}
      </div>

      {/* ── Stack ── */}
      <div ref={stackRef}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 20,
          marginBottom: 40,
          paddingBottom: 24,
          borderBottom: '1px solid var(--line)',
        }}>
          <h2 style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 'clamp(40px, 11vw, 72px)' : 'clamp(48px, 6vw, 80px)',
            lineHeight: 0.94,
            letterSpacing: '-0.035em',
            margin: 0,
            paddingBottom: '0.06em',
          }}>
            {sp.stackTitle}
          </h2>
          <span style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--type-muted)',
          }}>
            {sp.stack.reduce((sum, c) => sum + c.items.length, 0)} tecnologías
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 0,
          borderLeft: '1px solid var(--line)',
          borderTop: '1px solid var(--line)',
        }}>
          {sp.stack.map((cat) => (
            <div
              key={cat.label}
              style={{
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                padding: isMobile ? '16px 14px 20px' : '28px 28px 32px',
              }}
            >
              <div style={{
                fontFamily: 'var(--ui)',
                fontSize: 10,
                letterSpacing: '.26em',
                textTransform: 'uppercase',
                color: 'var(--type-soft)',
                marginBottom: 20,
              }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cat.items.map((tech) => (
                  <span key={tech} style={{
                    fontFamily: 'var(--display)',
                    fontSize: 'clamp(16px, 4.5vw, 28px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    color: 'var(--type)',
                    lineHeight: 1.1,
                  }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ svc, accent, ctaLabel, maxIncludes, motionSpeed, isMobile, onServiceClick }) {
  const slow = `${0.22 / motionSpeed}s ease`;

  return (
    <div style={{
      ...(isMobile
        ? { border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }
        : { borderRight: '1px solid var(--line)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }),
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: accent }} />

      <div style={{ padding: '28px 28px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Code + name */}
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
          fontSize: isMobile ? 'clamp(24px, 6.5vw, 38px)' : 'clamp(26px, 2.6vw, 38px)',
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          marginBottom: 20,
          paddingBottom: '0.06em',
        }}>
          {svc.name}
        </div>

        {/* Price */}
        <div style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(28px, 8vw, 46px)' : 'clamp(32px, 3.2vw, 46px)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          paddingBottom: '0.06em',
          marginBottom: 6,
        }}>
          {svc.price}
        </div>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 10,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 28,
        }}>
          {svc.time}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--line)', marginBottom: 22 }} />

        {/* Includes (top N items) */}
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          flex: 1,
        }}>
          {svc.includes.slice(0, maxIncludes).map((item) => {
            const name = typeof item === 'string' ? item : item.name;
            return (
              <li key={name} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontFamily: 'var(--body)',
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--type-soft)',
              }}>
                <span style={{ color: accent, flexShrink: 0, marginTop: 1 }}>✓</span>
                {name}
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onServiceClick?.(svc.code)}
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-pill)',
            padding: '13px 18px',
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--type)',
            cursor: 'pointer',
            transition: `border-color ${slow}, background ${slow}`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = accent;
            e.currentTarget.style.background  = 'var(--bg-3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.background  = 'transparent';
          }}
        >
          {ctaLabel}
          <span style={{ color: accent }}>↗</span>
        </button>
      </div>
    </div>
  );
}
