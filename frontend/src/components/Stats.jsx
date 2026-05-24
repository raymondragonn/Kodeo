import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBreakpoint } from '../hooks/useBreakpoint';

gsap.registerPlugin(ScrollTrigger);

export default function Stats({ copy, motionSpeed = 1 }) {
  const sectionRef   = useRef(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('[data-stat]'), {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        opacity: 0,
        y: 30,
        duration: 0.7 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: isMobile ? '40px 20px' : '60px 40px',
        borderTop: '1px solid var(--line)',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 28 : 24,
        alignItems: 'center',
      }}
    >
      {copy.stats.map((s, i) => (
        <div key={i} data-stat style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(44px, 5vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}>
            {s.n}
          </span>
          <span style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
          }}>
            {s.label}
          </span>
        </div>
      ))}
    </section>
  );
}
