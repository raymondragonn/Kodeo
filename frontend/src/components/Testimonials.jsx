import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBreakpoint } from '../hooks/useBreakpoint';
const aixaAvatar  = '/assets/reviews/aixa.svg';
const incupAvatar = '/assets/reviews/incup.svg';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIAL_AVATARS = {
  'Yessica Barradas': aixaAvatar,
  'Axel Heriberto Ortega Silva': incupAvatar,
};

const TESTIMONIAL_AVATAR_STYLES = {
  'Yessica Barradas': {
    width: 40,
    height: 40,
    objectFit: 'cover',
    objectPosition: 'center',
  },
  'Axel Heriberto Ortega Silva': {
    width: 28,
    height: 28,
    objectFit: 'cover',
    objectPosition: 'center',
  },
};

export default function Testimonials({ copy, motionSpeed = 1 }) {
  const sectionRef   = useRef(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('figure'), {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        opacity: 0,
        y: 50,
        duration: 0.9 / motionSpeed,
        stagger: 0.15,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      style={{ padding: isMobile ? '70px 20px' : '120px 40px', borderTop: '1px solid var(--line)' }}
    >
      <div style={{
        fontFamily: 'var(--ui)',
        fontSize: 11,
        letterSpacing: '.22em',
        textTransform: 'uppercase',
        color: 'var(--type-soft)',
        marginBottom: 30,
      }}>
          04 — Voces
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
        gap: isMobile ? 44 : 70,
      }}>
        {copy.testimonials.items.map((t, i) => (
          <figure key={i} style={{ margin: 0 }}>
            <blockquote style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              fontSize: isMobile ? 'clamp(21px, 6.5vw, 32px)' : 'clamp(24px, 3vw, 38px)',
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-0.015em',
            }}>
              <span style={{ color: 'var(--type-soft)' }}>"</span>
              {t.quote}
              <span style={{ color: 'var(--type-soft)' }}>"</span>
            </blockquote>
            <figcaption style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'var(--ui)',
              fontSize: 11,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
            }}>
              {TESTIMONIAL_AVATARS[t.who] ? (
                <img
                  src={TESTIMONIAL_AVATARS[t.who]}
                  alt={t.who}
                  style={{
                    width: TESTIMONIAL_AVATAR_STYLES[t.who]?.width ?? 28,
                    height: TESTIMONIAL_AVATAR_STYLES[t.who]?.height ?? 28,
                    borderRadius: '50%',
                    objectFit: TESTIMONIAL_AVATAR_STYLES[t.who]?.objectFit ?? 'cover',
                    objectPosition: TESTIMONIAL_AVATAR_STYLES[t.who]?.objectPosition ?? 'center',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--line-2)',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
              )}
              {t.who} · {t.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
