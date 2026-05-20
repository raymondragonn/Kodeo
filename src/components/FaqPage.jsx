import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';

function AccordionItem({ question, answer, motionSpeed = 1 }) {
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
          padding: '24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(16px, 2vw, 24px)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25,
          color: 'var(--type)',
        }}>
          {question}
        </span>
        <span style={{
          flexShrink: 0,
          width: 32, height: 32,
          borderRadius: '50%',
          border: '1px solid var(--line-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          lineHeight: 1,
          color: 'var(--type-soft)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: `transform ${dur}s ease`,
          fontFamily: 'var(--ui)',
          fontWeight: 300,
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
          paddingBottom: 24,
          margin: 0,
          maxWidth: 560,
        }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function FaqPage({ copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onExtrasClick }) {
  const wrapRef      = useRef(null);
  const headRef      = useRef(null);
  const listRef      = useRef(null);
  const faq          = copy.faq;
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.from(headRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0,
        y: 36,
        duration: 0.8 / motionSpeed,
        stagger: 0.1,
        ease: 'power3.out',
      });
      gsap.from(Array.from(listRef.current.children), {
        opacity: 0,
        y: 18,
        duration: 0.55 / motionSpeed,
        stagger: 0.07,
        ease: 'power3.out',
        delay: 0.18,
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
      />

      <section style={{
        padding: isMobile ? '50px 20px 80px' : '100px 40px 140px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr',
        gap: isMobile ? '40px' : '80px',
        alignItems: 'start',
      }}>
        {/* Left column */}
        <div ref={headRef} style={{ position: isMobile ? 'static' : 'sticky', top: 120 }}>
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
            {faq.label}
          </div>

          <h1
            data-reveal
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: isMobile ? 'clamp(44px, 12vw, 72px)' : 'clamp(52px, 7vw, 92px)',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              margin: '0 0 24px',
              paddingBottom: '0.06em',
            }}
          >
            {faq.heading[0]}
            <br />
            <span style={{ color: 'var(--type-soft)', fontWeight: 700 }}>{faq.heading[1]}</span>
          </h1>

          <p
            data-reveal
            style={{
              fontFamily: 'var(--body)',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'var(--type-soft)',
              margin: '0 0 32px',
              maxWidth: 300,
            }}
          >
            {faq.sub}
          </p>

          <button
            data-reveal
            onClick={onContact}
            style={{
              background: 'transparent',
              color: 'var(--type)',
              border: '1px solid var(--line-2)',
              padding: '14px 24px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--body)',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'border-color 0.25s, color 0.25s',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--type)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; }}
          >
            {faq.ctaBtn}.
          </button>
        </div>

        {/* Right column — accordion */}
        <div ref={listRef} style={{ borderTop: '1px solid var(--line)' }}>
          {faq.items.map((item, i) => (
            <AccordionItem
              key={i}
              question={item.q}
              answer={item.a}
              motionSpeed={motionSpeed}
            />
          ))}
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
