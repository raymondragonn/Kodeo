import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useBreakpoint } from '../hooks/useBreakpoint';

const PROJECT_IMAGES = {
  '01': ['/assets/projects/incup/incup-1.webp',       '/assets/projects/incup/incup-2.webp',       '/assets/projects/incup/incup-3.webp'],
  '02': ['/assets/projects/tudi/tudi-1.webp',         '/assets/projects/tudi/tudi-2.webp',         '/assets/projects/tudi/tudi-3.webp'],
  '03': ['/assets/projects/ferboda/ferboda-2.webp',   '/assets/projects/ferboda/ferboda-3.webp',   '/assets/projects/ferboda/ferboda-4.webp', '/assets/projects/ferboda/ferboda-5.webp', '/assets/projects/ferboda/ferboda-6.webp'],
  '04': ['/assets/projects/stratpharma/stratpharma-1.webp', '/assets/projects/stratpharma/stratpharma-2.webp', '/assets/projects/stratpharma/stratpharma-3.webp'],
  '05': ['/assets/projects/aramondra/aramondra-1.webp', '/assets/projects/aramondra/aramondra-2.webp', '/assets/projects/aramondra/aramondra-3.webp'],
};

const ACCENT_MAP = {
  'Landing Page': 'var(--accent-green)',
  'Sitio Web':    'var(--accent-blue)',
  'Website':      'var(--accent-blue)',
  'Online Store': 'var(--accent-yellow)',
  'Tienda Online':'var(--accent-yellow)',
};

export default function ProjectModal({ project, copy, onClose }) {
  const backdropRef  = useRef(null);
  const panelRef     = useRef(null);
  const closingRef   = useRef(false);
  const { isMobile } = useBreakpoint();

  const images = PROJECT_IMAGES[project.idx] ?? [];
  const [activeImg, setActiveImg] = useState(0);
  const [fade,      setFade]      = useState(true);
  const accent = ACCENT_MAP[project.tag] ?? 'var(--accent-green)';

  // Auto-advance images
  useEffect(() => {
    if (images.length <= 1) return;
    const INTERVAL  = 2800;
    const FADE_OUT  = 280;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveImg(i => (i + 1) % images.length);
        setFade(true);
      }, FADE_OUT);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [images.length]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Entrance animation
  useEffect(() => {
    const backdrop = backdropRef.current;
    const panel    = panelRef.current;
    if (!backdrop || !panel) return;

    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.fromTo(panel, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out', delay: 0.06 });
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const backdrop = backdropRef.current;
    const panel    = panelRef.current;
    if (!backdrop || !panel) { onClose(); return; }
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(panel,    { opacity: 0, y: 24, duration: 0.2, ease: 'power2.in' });
    tl.to(backdrop, { opacity: 0, duration: 0.16, ease: 'power2.in' }, '-=0.08');
  }, [onClose]);

  // ESC key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const modal = (
    <>
      {/* Backdrop — separate element so click-outside is reliable */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />

      {/* Panel wrapper — centers the panel, does not intercept clicks itself */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : '24px 20px',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: isMobile ? '100%' : 1060,
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : 'min(800px, 88vh)',
            background: 'var(--bg-2)',
            border: isMobile ? 'none' : '1px solid var(--line)',
            borderRadius: isMobile ? 0 : 'var(--radius-lg)',
            boxShadow: isMobile ? 'none' : 'var(--modal-shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Top bar ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '14px 20px' : '16px 24px',
            borderBottom: '1px solid var(--line)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--ui)',
                fontSize: 10,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                color: 'var(--type-soft)',
              }}>
                {project.idx} · {project.tag}
              </span>
            </div>

            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--type)',
                width: 32, height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                lineHeight: 1,
                fontFamily: 'var(--ui)',
                flexShrink: 0,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--type-soft)';
                e.currentTarget.style.background  = 'var(--bg-3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.background  = 'transparent';
              }}
            >
              ×
            </button>
          </div>

          {/* ── Body ── */}
          {isMobile ? (
            // Mobile: stacked, scrollable
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 32px' }}>
              <MobileBody
                project={project}
                images={images}
                activeImg={activeImg}
                setActiveImg={setActiveImg}
                fade={fade}
                setFade={setFade}
                copy={copy}
              />
            </div>
          ) : (
            // Desktop: side-by-side, fixed height
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.05fr 1fr',
              flex: 1,
              minHeight: 0,
            }}>
              {/* Left: image gallery */}
              <div style={{
                borderRight: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Main image */}
                <div style={{
                  flex: 1,
                  overflow: 'hidden',
                  background: 'var(--bg-3)',
                  lineHeight: 0,
                  minHeight: 0,
                  position: 'relative',
                }}>
                  {images[activeImg] && (
                    <img
                      src={images[activeImg]}
                      alt={`${project.name} ${activeImg + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        display: 'block',
                        opacity: fade ? 1 : 0,
                        transition: 'opacity 0.28s ease',
                      }}
                    />
                  )}
                </div>

                {/* Dot indicators */}
                {images.length > 1 && (
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'center',
                    padding: '10px 12px',
                    borderTop: '1px solid var(--line)',
                    flexShrink: 0,
                  }}>
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveImg(i); setFade(true); }}
                        style={{
                          width: activeImg === i ? 18 : 6,
                          height: 6,
                          borderRadius: 3,
                          background: activeImg === i ? accent : 'var(--line-2)',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          transition: 'width 0.25s ease, background 0.25s ease',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: info */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '28px 28px 24px',
                overflow: 'hidden',
              }}>
                <div style={{
                  fontFamily: 'var(--ui)',
                  fontSize: 10,
                  letterSpacing: '.24em',
                  textTransform: 'uppercase',
                  color: 'var(--type-soft)',
                  marginBottom: 10,
                }}>
                  {project.kind}
                </div>

                <h2 style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  fontSize: 'clamp(36px, 4vw, 56px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.03em',
                  margin: '0 0 20px',
                  paddingBottom: '0.06em',
                }}>
                  {project.name}
                </h2>

                <p style={{
                  fontFamily: 'var(--body)',
                  fontSize: 14,
                  lineHeight: 1.72,
                  color: 'var(--type-soft)',
                  margin: '0 0 20px',
                  flex: 1,
                  overflowY: 'auto',
                }}>
                  {project.desc}
                </p>

                {/* Stack pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                  {(project.stack ?? []).map(t => (
                    <span key={t} style={{
                      fontFamily: 'var(--ui)',
                      fontSize: 10,
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'var(--type-soft)',
                      padding: '5px 10px',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-pill)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Footer: url + button */}
                <div style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--ui)',
                    fontSize: 10,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: 'var(--type-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {project.url.replace(/^https?:\/\//, '')}
                  </span>

                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--type)',
                        color: 'var(--bg)',
                        padding: '11px 20px',
                        borderRadius: 'var(--radius-pill)',
                        fontFamily: 'var(--ui)',
                        fontSize: 10,
                        letterSpacing: '.2em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        flexShrink: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      {copy.projects.visitSite} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function MobileBody({ project, images, activeImg, setActiveImg, fade, setFade, copy }) {
  const accent = ACCENT_MAP[project.tag] ?? 'var(--accent-green)';

  return (
    <>
      <div style={{
        fontFamily: 'var(--ui)',
        fontSize: 10,
        letterSpacing: '.24em',
        textTransform: 'uppercase',
        color: 'var(--type-soft)',
        marginBottom: 8,
      }}>
        {project.kind}
      </div>

      <h2 style={{
        fontFamily: 'var(--display)',
        fontWeight: 400,
        fontSize: 'clamp(36px, 10vw, 52px)',
        lineHeight: 0.95,
        letterSpacing: '-0.03em',
        margin: '0 0 18px',
        paddingBottom: '0.06em',
      }}>
        {project.name}
      </h2>

      {/* Main image */}
      {images[activeImg] && (
        <div style={{
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'var(--bg-3)',
          lineHeight: 0,
          marginBottom: 8,
        }}>
          <img
            src={images[activeImg]}
            alt={project.name}
            style={{ width: '100%', display: 'block', opacity: fade ? 1 : 0, transition: 'opacity 0.28s ease' }}
          />
        </div>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveImg(i); setFade(true); }}
              style={{
                width: activeImg === i ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: activeImg === i ? accent : 'var(--line-2)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 0.25s ease, background 0.25s ease',
              }}
            />
          ))}
        </div>
      )}

      <p style={{
        fontFamily: 'var(--body)',
        fontSize: 14,
        lineHeight: 1.72,
        color: 'var(--type-soft)',
        margin: '0 0 18px',
      }}>
        {project.desc}
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {(project.stack ?? []).map(t => (
          <span key={t} style={{
            fontFamily: 'var(--ui)',
            fontSize: 10,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--type-soft)',
            padding: '5px 10px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-pill)',
          }}>
            {t}
          </span>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid var(--line)',
        paddingTop: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <span style={{
          fontFamily: 'var(--ui)',
          fontSize: 10,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--type-muted)',
        }}>
          {project.url.replace(/^https?:\/\//, '')}
        </span>

        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'var(--type)',
              color: 'var(--bg)',
              padding: '13px 20px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)',
              fontSize: 10,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {copy.projects.visitSite} ↗
          </a>
        )}
      </div>
    </>
  );
}
