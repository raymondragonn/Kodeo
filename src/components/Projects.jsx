import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProjectModal from './ProjectModal';
import { useBreakpoint } from '../hooks/useBreakpoint';

import incupCover       from '../assets/projects/incup/incup-mockup-cover.png?format=webp&width=800&quality=82';
import tudiCover        from '../assets/projects/tudi/tudi-mockup-cover.png?format=webp&width=800&quality=82';
import ferbodaCover     from '../assets/projects/ferboda/ferboda-mockup-cover.png?format=webp&width=800&quality=82';
import stratpharmaCover from '../assets/projects/stratpharma/stratpharma-mockup-cover.png?format=webp&width=800&quality=82';
import aramondaCover    from '../assets/projects/aramondra/aramondra-mockup-cover.png?format=webp&width=800&quality=82';

const PROJECT_COVERS = {
  '01': incupCover,
  '02': tudiCover,
  '03': ferbodaCover,
  '04': stratpharmaCover,
  '05': aramondaCover,
};

gsap.registerPlugin(ScrollTrigger);

export default function Projects({ copy, motionSpeed = 1 }) {
  const sectionRef    = useRef(null);
  const trackRef      = useRef(null);
  const headRef       = useRef(null);
  const { isMobile }  = useBreakpoint();
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        opacity: 0,
        y: 40,
        duration: 0.8 / motionSpeed,
        ease: 'power3.out',
      });

      // Horizontal scroll only on desktop
      if (isMobile) return;

      const track = trackRef.current;
      if (!track) return;

      const cards      = Array.from(track.children);
      const totalWidth = cards.reduce((sum, c) => sum + c.offsetWidth + 28, 0) - 28;
      const scrollDist = totalWidth - window.innerWidth + 80;

      if (scrollDist > 0) {
        gsap.to(track, {
          x: -scrollDist,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 5%',
            end: () => `+=${scrollDist}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed, copy.projects.items, isMobile]);

  return (
    <>
      <section
        ref={sectionRef}
        id="work"
        style={{
          background: 'var(--bg-2)',
          borderTop: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: isMobile ? '40px 20px 24px' : '60px 40px 30px' }}>
          <div ref={headRef} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 16,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--ui)',
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                color: 'var(--type-soft)',
                marginBottom: 10,
              }}>
                03 — Trabajo seleccionado
              </div>
              <h2 style={{
                fontFamily: 'var(--display)',
                fontWeight: 400,
                fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : 'clamp(48px, 6vw, 72px)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                margin: 0,
                whiteSpace: 'pre-line',
                paddingBottom: '0.08em',
              }}>
                {copy.projects.title}
              </h2>
            </div>
            {!isMobile && (
              <span style={{
                fontFamily: 'var(--ui)',
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                color: 'var(--type-soft)',
                flexShrink: 0,
              }}>
                ↔ scroll · {String(copy.projects.items.length).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        {isMobile ? (
          <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {copy.projects.items.map((p) => (
              <ProjectCard key={p.idx} project={p} onOpen={() => setActiveProject(p)} isMobile />
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 0 50px 40px', overflow: 'hidden' }}>
            <div
              ref={trackRef}
              style={{ display: 'flex', gap: 28, width: 'max-content' }}
            >
              {copy.projects.items.map((p) => (
                <ProjectCard key={p.idx} project={p} onOpen={() => setActiveProject(p)} />
              ))}
            </div>
          </div>
        )}
      </section>

      {activeProject && (
        <ProjectModal
          project={activeProject}
          copy={copy}
          onClose={() => setActiveProject(null)}
        />
      )}
    </>
  );
}

function ProjectCard({ project: p, onOpen, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const coverSrc = PROJECT_COVERS[p.idx];

  return (
    <div
      onClick={onOpen}
      style={{
        flex: isMobile ? 'none' : `0 0 clamp(300px, 28vw, 400px)`,
        width: isMobile ? '100%' : undefined,
        color: 'inherit',
        display: 'block',
        cursor: 'pointer',
      }}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
    >
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: hovered ? 'var(--line-2)' : 'var(--line)',
        transition: 'border-color 0.3s',
      }}>
        <div style={{
          width: '100%',
          height: isMobile ? 220 : 260,
          background: 'var(--card-frost)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={p.name}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.5s ease',
                transform: hovered ? 'scale(1.03)' : 'scale(1)',
              }}
            />
          ) : (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              preserveAspectRatio="none"
            >
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
              <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
            </svg>
          )}
        </div>

        {/* Tag badge */}
        <div style={{
          position: 'absolute',
          top: 14, left: 14,
          fontFamily: 'var(--ui)',
          fontSize: 10,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--badge-color)',
          padding: '5px 11px',
          background: 'var(--badge-bg)',
          borderRadius: 'var(--radius-pill)',
          backdropFilter: 'blur(8px)',
        }}>
          {p.idx} · {p.badge ?? p.tag}
        </div>

        {/* Arrow — always visible on mobile, hover on desktop */}
        <div style={{
          position: 'absolute',
          bottom: 14, right: 14,
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.18em',
          color: 'var(--badge-color)',
          padding: '5px 12px',
          background: 'var(--badge-bg)',
          borderRadius: 'var(--radius-pill)',
          backdropFilter: 'blur(8px)',
          opacity: isMobile ? 0.85 : (hovered ? 1 : 0),
          transform: hovered ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none',
        }}>
          Ver sitio ↗
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 28,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          transition: 'opacity 0.2s',
          opacity: hovered ? 1 : 0.9,
        }}>
          {p.name}
        </div>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginTop: 3,
        }}>
          {p.kind}
        </div>
      </div>
    </div>
  );
}
