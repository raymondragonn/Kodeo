import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBreakpoint } from '../hooks/useBreakpoint';
import landingCover    from '../assets/projects/landingpage-cover.png?format=webp&width=920&quality=82';
import websiteCover    from '../assets/projects/website-cover.png?format=webp&width=920&quality=82';
import tiendaCover     from '../assets/projects/tiendaenlinea-cover.png?format=webp&width=920&quality=82';
import landingPdf      from '../assets/LANDING PAGE - KODEO.pdf';
import sitioWebPdf     from '../assets/SITIO WEB - KODEO.pdf';
import tiendaPdf       from '../assets/TIENDA ONLINE - KODEO.pdf';

const SERVICE_COVERS = { '01': landingCover, '02': websiteCover, '03': tiendaCover };
const PDF_MAP        = { '01': landingPdf,   '02': sitioWebPdf,  '03': tiendaPdf };

gsap.registerPlugin(ScrollTrigger);

export default function Services({ copy, motionSpeed = 1, onServiceClick, onExtrasClick }) {
  const [hoverIdx, setHoverIdx]   = useState(null);
  const [autoIdx,  setAutoIdx]    = useState(0);
  const [fade,     setFade]       = useState(true);
  const sectionRef = useRef(null);
  const headRef    = useRef(null);
  const listRef    = useRef(null);
  const previewRef = useRef(null);
  const { isMobile } = useBreakpoint();

  // Auto-cycle covers when nothing is hovered
  useEffect(() => {
    if (hoverIdx !== null) return;
    const INTERVAL = 2200;
    const FADE_OUT = 300;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setAutoIdx(i => (i + 1) % copy.services.list.length);
        setFade(true);
      }, FADE_OUT);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [hoverIdx, copy.services.list.length]);

  const slow = `${0.5 / motionSpeed}s cubic-bezier(.2,.7,.2,1)`;

  useEffect(() => {
    const targets = [headRef.current, listRef.current, previewRef.current].filter(Boolean);
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        opacity: 0,
        y: 40,
        duration: 0.8 / motionSpeed,
        stagger: 0.12,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed]);

  return (
    <section
      ref={sectionRef}
      id="services"
      style={{
        padding: isMobile ? '60px 20px' : '100px 40px',
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr clamp(300px, 35vw, 460px)',
        gap: 60,
      }}
    >
      <div>
        <div
          ref={headRef}
          style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
            marginBottom: 18,
          }}
        >
          {copy.services.label}
        </div>
        <h2 style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: 'clamp(42px, 5vw, 72px)',
          lineHeight: 1,
          letterSpacing: '-0.025em',
          margin: '0 0 24px',
          paddingBottom: '0.08em',
        }}>
          {copy.services.title}
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--type-soft)',
          maxWidth: 460,
          lineHeight: 1.55,
          margin: '0 0 50px',
        }}>
          {copy.services.sub}
        </p>

        <div ref={listRef}>
          {copy.services.list.map((s, i) => (
            <div
              key={s.code}
              onClick={() => onServiceClick && onServiceClick(s.code)}
              onMouseEnter={() => !isMobile && setHoverIdx(i)}
              onMouseLeave={() => !isMobile && setHoverIdx(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '36px 1fr 24px' : '44px 1fr 130px 130px 30px',
                alignItems: 'center',
                padding: isMobile
                  ? '22px 0'
                  : `26px 0 26px ${hoverIdx === i ? 14 : 0}px`,
                borderTop: '1px solid var(--line)',
                cursor: 'pointer',
                color: hoverIdx === null || hoverIdx === i ? 'var(--type)' : 'var(--line-2)',
                transition: `color ${slow}, padding-left ${slow}`,
                fontFamily: 'var(--ui)',
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: 'var(--type-soft)', fontSize: isMobile ? 10 : 11 }}>{s.code}</span>

              {isMobile ? (
                <div>
                  <div style={{
                    fontFamily: 'var(--display)',
                    fontSize: 'clamp(24px, 6vw, 36px)',
                    textTransform: 'none',
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                    lineHeight: 1.15,
                    paddingBottom: '0.04em',
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--ui)',
                    fontSize: 10,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--type-soft)',
                    marginTop: 4,
                  }}>
                    {s.price} · {s.time}
                  </div>
                  {PDF_MAP[s.code] && (
                    <a
                      href={PDF_MAP[s.code]}
                      download
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: 10,
                        fontFamily: 'var(--ui)',
                        fontSize: 9,
                        letterSpacing: '.18em',
                        textTransform: 'uppercase',
                        color: 'var(--type-soft)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '6px 10px',
                        textDecoration: 'none',
                      }}
                    >
                      ↓ PDF
                    </a>
                  )}
                </div>
              ) : (
                <span style={{
                  fontFamily: 'var(--display)',
                  fontSize: 'clamp(28px, 3.5vw, 44px)',
                  textTransform: 'none',
                  letterSpacing: '-0.02em',
                  fontWeight: 400,
                  lineHeight: 1.15,
                  paddingBottom: '0.06em',
                }}>
                  {s.name}
                </span>
              )}

              {!isMobile && <span style={{ color: 'var(--type-soft)' }}>{s.time}</span>}
              {!isMobile && <span style={{ textAlign: 'right' }}>{s.price}</span>}

              <span style={{
                textAlign: 'right',
                color: 'var(--type-soft)',
                transform: hoverIdx === i ? 'translateX(0)' : 'translateX(-6px)',
                opacity: isMobile ? 0.6 : (hoverIdx === i ? 1 : 0.4),
                transition: `transform ${slow}, opacity ${slow}`,
              }}>
                →
              </span>
            </div>
          ))}

          {/* Mantenimiento — secondary row */}
          {onExtrasClick && (
            <div
              onClick={onExtrasClick}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '36px 1fr 24px' : '44px 1fr auto 30px',
                alignItems: 'center',
                padding: isMobile ? '16px 0' : '16px 0',
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                cursor: 'pointer',
                color: 'var(--type-soft)',
                transition: `color ${slow}`,
                fontFamily: 'var(--ui)',
                fontSize: 10,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
            >
              <span>+</span>
              <span style={{
                fontFamily: 'var(--display)',
                fontSize: isMobile ? 'clamp(18px, 5vw, 26px)' : 'clamp(18px, 2vw, 26px)',
                textTransform: 'none',
                letterSpacing: '-0.015em',
                fontWeight: 400,
                lineHeight: 1.2,
                paddingBottom: '0.04em',
              }}>
                {copy.extrasPage?.eyebrow ?? 'Mantenimiento'}
              </span>
              {!isMobile && (
                <span style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>
                  {copy.extrasPage?.plans?.[0]?.price ?? ''} — {copy.extrasPage?.plans?.[2]?.price ?? ''}
                </span>
              )}
              <span style={{ textAlign: 'right', opacity: 0.5 }}>→</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview pane — desktop only */}
      {!isMobile && (
        <div
          ref={previewRef}
          style={{ position: 'sticky', top: 100, height: 540, alignSelf: 'start' }}
        >
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-3)',
            border: '1px solid var(--line)',
            transition: `background ${slow}`,
          }}>
            {/* Cover image — auto-cycles when idle, locked to hovered service */}
            {(() => {
              const activeIdx = hoverIdx !== null ? hoverIdx : autoIdx;
              const code = copy.services.list[activeIdx].code;
              const src  = SERVICE_COVERS[code];
              const isAuto = hoverIdx === null;
              return src ? (
                <img
                  key={code}
                  src={src}
                  alt={copy.services.list[activeIdx].name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top',
                    opacity: isAuto ? (fade ? 1 : 0) : 1,
                    transition: isAuto ? 'opacity 0.3s ease' : `opacity ${slow}`,
                  }}
                />
              ) : null;
            })()}

            {/* Accent bar */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-yellow)'][hoverIdx !== null ? hoverIdx : autoIdx],
              transition: `background ${slow}`,
            }} />

            {/* Gradient overlay so text stays legible over the cover image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 28,
            }}>
              {(() => {
                const activeIdx = hoverIdx !== null ? hoverIdx : autoIdx;
                const svc = copy.services.list[activeIdx];
                return (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--ui)',
                      fontSize: 10,
                      letterSpacing: '.24em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.7)',
                    }}>
                      <span>Preview</span>
                      <span>{svc.code} / 03</span>
                    </div>
                    <div>
                      <div style={{
                        fontFamily: 'var(--ui)',
                        fontSize: 10,
                        letterSpacing: '.24em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: 10,
                        opacity: hoverIdx === null ? (fade ? 1 : 0) : 1,
                        transition: hoverIdx === null ? 'opacity 0.3s ease' : `opacity ${slow}`,
                      }}>
                        {hoverIdx === null ? copy.services.previewHint : copy.services.previewSelected}
                      </div>
                      <div style={{
                        fontFamily: 'var(--display)',
                        fontSize: 'clamp(28px, 3.5vw, 42px)',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                        paddingBottom: '0.1em',
                        color: '#fff',
                        opacity: hoverIdx === null ? (fade ? 1 : 0) : 1,
                        transition: hoverIdx === null ? 'opacity 0.3s ease' : `opacity ${slow}`,
                      }}>
                        {svc.name}
                      </div>
                      <div style={{
                        marginTop: 16,
                        fontFamily: 'var(--ui)',
                        fontSize: 11,
                        letterSpacing: '.14em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.7)',
                        opacity: hoverIdx === null ? (fade ? 1 : 0) : 1,
                        transition: hoverIdx === null ? 'opacity 0.3s ease' : `opacity ${slow}`,
                      }}>
                        {svc.price} · {svc.time}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
