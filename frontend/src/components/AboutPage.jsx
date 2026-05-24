import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';
const PHOTOS = [
  '/assets/team/img_KodeoTeam.jpg',
  '/assets/team/img_KodeoTeam2.jpg',
  '/assets/team/img_KodeoTeam3.jpg',
];

function PhotoCarousel({ motionSpeed = 1 }) {
  const [idx, setIdx] = useState(0);
  const imgRef = useRef(null);
  const dur = 0.22 / motionSpeed;

  const goTo = (next) => {
    gsap.to(imgRef.current, {
      opacity: 0, duration: dur,
      onComplete: () => {
        setIdx(next);
        gsap.to(imgRef.current, { opacity: 1, duration: dur });
      },
    });
  };

  const prev = () => goTo((idx - 1 + PHOTOS.length) % PHOTOS.length);
  const next = () => goTo((idx + 1) % PHOTOS.length);

  const arrowBtn = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    width: 36,
    height: 36,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    zIndex: 2,
    transition: 'background 0.2s',
  };

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-3)', border: '1px solid var(--line)', aspectRatio: '4/5' }}>
      <img
        ref={imgRef}
        src={PHOTOS[idx]}
        alt="Kodeo team"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      <button
        onClick={prev}
        style={{ ...arrowBtn, left: 12 }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
      >
        ‹
      </button>
      <button
        onClick={next}
        style={{ ...arrowBtn, right: 12 }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
      >
        ›
      </button>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
        {PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === idx ? 20 : 6,
              height: 6,
              borderRadius: 'var(--radius-pill)',
              background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)',
              border: 0,
              cursor: 'pointer',
              padding: 0,
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AccordionItem({ title, content, motionSpeed = 1 }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);
  const dur = 0.35 / motionSpeed;

  useEffect(() => {
    if (open) {
      const h = bodyRef.current.scrollHeight;
      gsap.to(bodyRef.current, { height: h, opacity: 1, duration: dur, ease: 'power3.out' });
    } else {
      gsap.to(bodyRef.current, { height: 0, opacity: 0, duration: dur * 0.7, ease: 'power2.in' });
    }
  }, [open, dur]);

  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%',
          background: 'none',
          border: 0,
          padding: '26px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 'clamp(17px, 4.5vw, 22px)',
          letterSpacing: '-0.01em',
          color: 'var(--type)',
        }}>
          {title}
        </span>
        <span style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid var(--line-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          lineHeight: 1,
          color: 'var(--type-soft)',
          fontFamily: 'var(--ui)',
          fontWeight: 300,
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: `transform ${dur}s ease`,
        }}>
          +
        </span>
      </button>

      <div ref={bodyRef} style={{ height: 0, overflow: 'hidden', opacity: 0 }}>
        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 15,
          lineHeight: 1.75,
          color: 'var(--type-soft)',
          paddingBottom: 28,
          margin: 0,
          maxWidth: 540,
        }}>
          {content}
        </p>
      </div>
    </div>
  );
}

export default function AboutPage({ copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onServiceClick, onExtrasClick, onAuthClick }) {
  const wrapRef      = useRef(null);
  const heroRef      = useRef(null);
  const moreRef      = useRef(null);
  const ab           = copy.about;
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.from(heroRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0, y: 40,
        duration: 0.8 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, wrapRef);
    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <div ref={wrapRef} style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onExtrasClick={onExtrasClick}
        onAuthClick={onAuthClick}
      />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        style={{
          padding: isMobile ? '48px 20px 60px' : '80px 40px 100px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
          gap: isMobile ? 36 : 60,
          alignItems: 'center',
        }}
      >
        <div data-reveal>
          <PhotoCarousel motionSpeed={motionSpeed} />
        </div>

        <div>
          <div
            data-reveal
            style={{
              fontFamily: 'var(--ui)',
              fontSize: 11,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
              marginBottom: 24,
            }}
          >
            {ab.label}
          </div>

          <h1
            data-reveal
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: 'clamp(52px, 7vw, 96px)',
              lineHeight: 0.93,
              letterSpacing: '-0.04em',
              margin: '0 0 40px',
              textTransform: 'uppercase',
            }}
          >
            {ab.heroHeading[0]}<br />
            {ab.heroHeading[1]}
          </h1>

          <blockquote
            data-reveal
            style={{
              fontFamily: 'var(--body)',
              fontSize: 'clamp(15px, 4vw, 18px)',
              lineHeight: 1.75,
              color: 'var(--type-soft)',
              margin: 0,
              borderLeft: '2px solid var(--line-2)',
              paddingLeft: 24,
            }}
          >
            "{ab.quote}"
          </blockquote>
        </div>
      </section>

      {/* ── MÁS ACERCA DE ── */}
      <section
        ref={moreRef}
        style={{
          padding: isMobile ? '60px 20px 80px' : '100px 40px 140px',
          borderTop: '1px solid var(--line)',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr',
          gap: isMobile ? 36 : 80,
          alignItems: 'start',
          background: 'var(--bg-2)',
        }}
      >
        {/* Left sticky heading */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: 120 }}>
          <h2 style={{
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: 'clamp(42px, 6vw, 80px)',
            lineHeight: 0.93,
            letterSpacing: '-0.04em',
            margin: 0,
            textTransform: 'uppercase',
          }}>
            {ab.moreHeading[0]}<br />
            <span style={{ color: 'var(--type-soft)' }}>{ab.moreHeading[1]}</span>
          </h2>
        </div>

        {/* Right accordion */}
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {ab.accordion.map((item, i) => (
            <AccordionItem
              key={i}
              title={item.title}
              content={item.content}
              motionSpeed={motionSpeed}
            />
          ))}
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onBack} />
    </div>
  );
}
