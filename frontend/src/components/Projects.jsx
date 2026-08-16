import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { PROJECT_SLUGS, PROJECT_COVERS, PROJECT_SHOTS } from '../lib/projects';
import Icon from './Icon';

gsap.registerPlugin(ScrollTrigger);

export default function Projects({ copy, motionSpeed = 1 }) {
  const sectionRef    = useRef(null);
  const headRef       = useRef(null);
  const { isMobile }  = useBreakpoint();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        opacity: 0,
        y: 40,
        duration: 0.8 / motionSpeed,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [motionSpeed]);

  // Esta sección ya no fija la pantalla con ScrollTrigger, así que su alto lo
  // decide el carrusel al montarse. Los triggers de las secciones siguientes
  // (reseñas, estadísticas, contacto) se crean antes de eso y se quedaban con
  // posiciones viejas: si su punto de disparo ya había pasado, nunca llegaban a
  // animarse y su contenido se quedaba en opacity 0. Un refresh tras el primer
  // layout las recalcula.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

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
          </div>
        </div>

        {/* Cards */}
        <ProjectCarousel items={copy.projects.items} copy={copy} isMobile={isMobile} />
      </section>
    </>
  );
}

// El centrado lo hace el scroll nativo con scroll-snap: las flechas y el clic
// solo llaman a scrollTo, y el activo se deduce de qué tarjeta quedó más cerca
// del centro — así arrastrar con el trackpad da el mismo resultado.
function ProjectCarousel({ items, copy, isMobile }) {
  const trackRef = useRef(null);
  // El carrusel arranca en el proyecto marcado como `featured` en copy.js.
  const initialIndex = Math.max(0, items.findIndex(p => p.featured));
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const track = trackRef.current;
    const card  = track?.children[initialIndex];
    if (card) track.scrollLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
  }, [initialIndex]);

  const centerCard = (i) => {
    const track = trackRef.current;
    const card  = track?.children[i];
    if (!card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const syncIndex = () => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let min     = Infinity;
    Array.from(track.children).forEach((card, i) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (distance < min) { min = distance; closest = i; }
    });
    setIndex(closest);
  };

  const go = (delta) => {
    const next = Math.min(items.length - 1, Math.max(0, index + delta));
    centerCard(next);
  };

  return (
    <div style={{ position: 'relative', padding: isMobile ? '12px 0 26px' : '20px 0 50px' }}>
      <div
        ref={trackRef}
        className="no-scrollbar"
        onScroll={syncIndex}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
        }}
        tabIndex={0}
        style={{
          '--card-w': isMobile ? 'min(86vw, 420px)' : 'clamp(320px, 70vw, 920px)',
          display: 'flex',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? 16 : 28,
          paddingBlock: isMobile ? '8px 12px' : 0,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          // Los extremos también tienen que poder quedar centrados.
          paddingInline: isMobile ? 'max(20px, calc(50% - var(--card-w) / 2))' : 'max(40px, calc(50% - var(--card-w) / 2))',
          outline: 'none',
        }}
      >
        {items.map((p, i) => (
          <ProjectCard
            key={p.idx}
            project={p}
            copy={copy}
            active={i === index}
            side={i < index ? 'left' : 'right'}
            isMobile={isMobile}
            onSelect={() => centerCard(i)}
          />
        ))}
      </div>

      <CarouselArrow
        dir="prev"
        label={copy.projects.prevLabel}
        disabled={index === 0}
        isMobile={isMobile}
        onClick={() => go(-1)}
      />
      <CarouselArrow
        dir="next"
        label={copy.projects.nextLabel}
        disabled={index === items.length - 1}
        isMobile={isMobile}
        onClick={() => go(1)}
      />
    </div>
  );
}

function CarouselArrow({ dir, label, disabled, onClick, isMobile }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        position: 'absolute',
        // En móvil la ficha va debajo de la galería: se alinean con la imagen
        // para no quedar encima del texto.
        top: isMobile ? '22%' : '50%',
        transform: 'translateY(-50%)',
        [dir === 'prev' ? 'left' : 'right']: isMobile ? 6 : 20,
        width: isMobile ? 36 : 46, height: isMobile ? 36 : 46,
        display: 'grid', placeItems: 'center',
        borderRadius: '50%',
        border: '1px solid var(--line-2)',
        background: 'var(--badge-bg)',
        backdropFilter: 'blur(8px)',
        color: 'var(--type)',
        fontSize: 18,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.25 : 1,
        transition: 'opacity 0.25s ease',
      }}
    >
      <Icon name={dir === 'prev' ? 'chevronLeft' : 'chevronRight'} size={isMobile ? 15 : 18} />
    </button>
  );
}

const ACCENT_MAP = {
  'Landing Page': 'var(--accent-green)',
  'Sitio Web':    'var(--accent-blue)',
  'Website':      'var(--accent-blue)',
  'Online Store': 'var(--accent-yellow)',
  'Tienda Online':'var(--accent-yellow)',
};

// El trabajo seleccionado se despliega con el mismo diseño que tenía el modal
// (galería a la izquierda, ficha a la derecha), pero dentro del carrusel.
// Todas las tarjetas comparten el diseño del antiguo modal —galería + ficha—
// para que el carrusel no cambie de tamaño al moverse: la seleccionada se
// ilumina y las vecinas se atenúan y desenfocan. La altura la marca la galería,
// que respeta la proporción de las capturas (16:10) en vez de recortarlas.
function ProjectCard({ project: p, copy, onSelect, active = true, side = 'right', isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [img, setImg]         = useState(0);
  const [fade, setFade]       = useState(true);
  const cover   = PROJECT_COVERS[p.idx];
  const images  = PROJECT_SHOTS[p.idx] ?? [];
  const accent  = ACCENT_MAP[p.tag] ?? 'var(--accent-green)';
  const href    = `/portafolio/${PROJECT_SLUGS[p.name] ?? ''}`;

  // Pase automático de la galería, como hacía el modal, solo en la elegida.
  useEffect(() => {
    if (!active || images.length <= 1) return;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setImg(i => (i + 1) % images.length);
        setFade(true);
      }, 280);
    }, 3200);
    return () => clearInterval(id);
  }, [active, images.length]);

  const panel = (
    <div style={{
      position: 'relative',
      background: 'var(--bg-2)',
      border: '1px solid',
      borderColor: active && hovered ? 'var(--line-2)' : 'var(--line)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: active ? 'var(--modal-shadow)' : 'none',
      transition: 'border-color 0.3s, box-shadow 0.45s ease',
    }}>
      {/* Filo de acento: marca el proyecto elegido sin añadir ruido. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accent,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.45s ease',
        zIndex: 1,
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr' }}>
        {/* Galería */}
        <div style={{ [isMobile ? 'borderBottom' : 'borderRight']: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            aspectRatio: '16 / 10',
            background: 'var(--bg-3)',
            overflow: 'hidden',
            lineHeight: 0,
          }}>
            <img
              src={(active && images[img]) || cover}
              alt={p.name}
              loading="lazy"
              decoding="async"
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
          </div>

          {active && images.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'center',
              padding: '12px',
              borderTop: '1px solid var(--line)',
            }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${p.name} ${i + 1}`}
                  onClick={() => { setImg(i); setFade(true); }}
                  style={{
                    width: img === i ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: img === i ? accent : 'var(--line-2)',
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

        {/* Ficha */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: isMobile ? '18px 18px 16px' : '26px 26px 22px' }}>
          <div style={{
            fontFamily: 'var(--ui)',
            fontSize: 10,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--type-muted)',
            marginBottom: 10,
          }}>
            {p.kind}
          </div>

          <h3 style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 26 : 'clamp(28px, 2.4vw, 40px)',
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
            margin: '0 0 14px',
            paddingBottom: '0.06em',
          }}>
            {p.name}
          </h3>

          <p style={{
            fontFamily: 'var(--body)',
            fontSize: isMobile ? 12.5 : 13.5,
            lineHeight: 1.65,
            color: 'var(--type-soft)',
            margin: '0 0 18px',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: isMobile ? 4 : 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {p.desc}
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {(p.stack ?? []).map(t => (
              <span key={t} style={{
                fontFamily: 'var(--ui)',
                fontSize: 9.5,
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
            paddingTop: 16,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: 12,
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
              {p.url?.replace(/^https?:\/\//, '')}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: 8, flexShrink: 0 }}>
              {/* Caso de estudio completo, para quien quiera leer más. */}
              <a
                href={href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--type-soft)',
                  border: '1px solid var(--line)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
              >
                {copy.projects.readMore}
              </a>

              {p.url && active && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--type)',
                    color: 'var(--bg)',
                    padding: '10px 18px',
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
                  {copy.projects.visitSite}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        flex: '0 0 var(--card-w)',
        scrollSnapAlign: 'center',
        opacity: active ? 1 : 0.4,
        filter: active ? 'none' : 'blur(1.5px)',
        transform: active ? 'scale(1)' : 'scale(0.92)',
        transformOrigin: 'center',
        // Curva de salida suave: el cambio de tarjeta se asienta en vez de cortarse.
        transition: 'opacity 0.5s cubic-bezier(.22,1,.36,1), transform 0.5s cubic-bezier(.22,1,.36,1), filter 0.5s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active ? panel : (
        // Las vecinas son un solo enlace: el clic las trae al centro.
        <a
          href={href}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            onSelect?.();
          }}
          style={{
            color: 'inherit',
            display: 'flex',
            justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
            cursor: 'pointer',
          }}
        >
          <div style={{ width: isMobile ? 'min(200px, 60%)' : 'min(360px, 42%)', textAlign: side === 'left' ? 'right' : 'left' }}>
            <div style={{
              aspectRatio: '4 / 3',
              background: 'var(--card-frost)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              {cover && (
                <img
                  src={cover}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
            </div>
            <div style={{
              fontFamily: 'var(--display)',
              fontSize: 22,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginTop: 12,
            }}>
              {p.name}
            </div>
            <div style={{
              fontFamily: 'var(--ui)',
              fontSize: 10,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
              marginTop: 3,
            }}>
              {p.kind}
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
