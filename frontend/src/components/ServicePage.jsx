import { useRef, useEffect } from 'react';
import { useNavigate } from '../lib/router-shim';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from './Footer';
import Nav from './Nav';
import RevealButton from './RevealButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SERVICE_COVERS } from '../lib/projects';
import { SERVICE_SLUGS } from '../lib/routes';
const landingPdf  = '/LANDING PAGE - KODEO.pdf';
const sitioWebPdf = '/SITIO WEB - KODEO.pdf';
const tiendaPdf   = '/TIENDA ONLINE - KODEO.pdf';
const tarjetaPdf  = '/TARJETA DE FIDELIDAD - KODEO.pdf';

gsap.registerPlugin(ScrollTrigger);

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
  '04': 'var(--accent-orange)',
};

const PDF_MAP = { '01': landingPdf, '02': sitioWebPdf, '03': tiendaPdf, '04': tarjetaPdf };

function LineBlock({ lines = 3, opacity = 0.4, height = 5 }) {
  const widths = Array.from({ length: lines }, (_, i) =>
    i === lines - 1 ? '55%' : i % 2 === 0 ? '100%' : '88%'
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {widths.map((w, i) => (
        <div
          key={i}
          style={{
            width: w,
            height,
            background: 'currentColor',
            opacity,
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}

export default function ServicePage({ copy, service, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick, onLogout, user, theme, onThemeToggle }) {
  const accent       = ACCENT[service.code] || 'var(--accent-green)';
  const heroRef      = useRef(null);
  const sp           = copy.servicePage;
  const { isMobile } = useBreakpoint();
  const navigate     = useNavigate();

  const handleCheckout = () => {
    navigate(`/agendar?producto=${SERVICE_SLUGS[service.code]}`);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.from(heroRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0,
        y: 40,
        duration: 0.8 / motionSpeed,
        stagger: 0.12,
        ease: 'power3.out',
      });
    }, heroRef);
    return () => ctx.revert();
  }, [service.code, motionSpeed]);

  const sectionPad = isMobile ? '60px 20px' : '90px 36px';
  const serviceFaqItems = sp.serviceFaq?.items?.[service.code] ?? [];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onAuthClick={onAuthClick}
        onLogout={onLogout}
        user={user}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />

      {/* HERO */}
      <section ref={heroRef} style={{ padding: isMobile ? '40px 20px 60px' : '60px 36px 90px', position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
        {/* Portada del producto de fondo: difuminada y tenue, con velo para que
            el titular y el texto se sigan leyendo. zIndex -1 la manda detrás de
            todo el contenido sin tener que posicionar cada bloque. */}
        {SERVICE_COVERS[service.code] && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
            <img
              src={SERVICE_COVERS[service.code]}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(80px)',
                transform: 'scale(1.25)',
                opacity: 0.55,
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--bg)',
              opacity: 0.35,
            }} />
          </div>
        )}

        <div data-reveal style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 26,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 10px ${accent}`,
            flexShrink: 0,
          }} />
          {sp.breadcrumb} · {service.code} · {service.name}
        </div>

        <h1 data-reveal style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(52px, 13vw, 90px)' : 'clamp(64px, 11vw, 150px)',
          lineHeight: 0.9,
          margin: 0,
          letterSpacing: '-0.04em',
          paddingBottom: '0.1em',
        }}>
          {service.name}<span style={{
              display: 'inline-block',
              width: '0.13em',
              height: '0.13em',
              borderRadius: '50%',
              background: 'var(--line-2)',
              verticalAlign: 'middle',
              marginLeft: '0.05em',
              marginBottom: '0.18em',
            }} />
        </h1>

        <div data-reveal style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr clamp(240px, 25vw, 320px)',
          gap: isMobile ? 24 : 60,
          alignItems: 'end',
          marginTop: isMobile ? 28 : 50,
        }}>
          <p style={{
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.5,
            color: 'var(--type-soft)',
            margin: 0,
            maxWidth: 580,
          }}>
            {service.lead}
          </p>
          <div>
            <dl style={{
              margin: 0,
              fontFamily: 'var(--ui)',
              fontSize: 11,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--type-soft)',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '12px 14px',
              alignItems: 'start',
            }}>
              {[
                [sp.specs.delivery,   service.time,  copy.services.timeNote],
                [sp.specs.investment, service.price, copy.services.priceNote],
              ].map(([dt, dd, note]) => (
                <>
                  <dt key={`dt-${dt}`} style={{ color: 'var(--type-soft)' }}>{dt}</dt>
                  <dd key={`dd-${dt}`} style={{ margin: 0, color: 'var(--type)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dd}
                    <span style={{ fontSize: 8, letterSpacing: '.12em', opacity: 0.6, color: 'var(--type-soft)' }}>{note}</span>
                  </dd>
                </>
              ))}
            </dl>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Mismo reveal de linterna que el CTA de la portada: RevealButton
                  ya trae el scale de hover y el fade antes de navegar. */}
              <RevealButton
                className="cta-breathe"
                onActivate={handleCheckout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--ui)',
                  fontSize: 11,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  background: 'var(--type)',
                  color: 'var(--bg)',
                  border: 0,
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                  transition: 'transform 0.2s ease, box-shadow 0.3s ease',
                }}
              >
                {sp.ctaStart} {service.name}
              </RevealButton>
              {PDF_MAP[service.code] && (
                <a
                  href={PDF_MAP[service.code]}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--ui)',
                    fontSize: 11,
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: 'var(--type)',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '10px 16px',
                    textDecoration: 'none',
                    transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--type)';
                    e.currentTarget.style.borderColor = 'var(--type)';
                    e.currentTarget.style.color = 'var(--bg)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-2)';
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.color = 'var(--type)';
                  }}
                >
                  {sp.downloadPdf ?? 'Descargar PDF'}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <Section pad={sectionPad}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: isMobile ? 36 : 60,
        }}>
          <div>
            <SectionLabel>{sp.problem.label}</SectionLabel>
            <h2 style={displayH2}>{service.problem || sp.problem.heading}</h2>
            {service.problemDesc
              ? <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--type-soft)', margin: 0 }}>{service.problemDesc}</p>
              : <LineBlock lines={4} />}
          </div>
          <div>
            <SectionLabel color={accent}>{sp.solution.label}</SectionLabel>
            <h2 style={displayH2}>{service.solution || sp.solution.heading}</h2>
            {service.solutionDesc
              ? <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--type-soft)', margin: 0 }}>{service.solutionDesc}</p>
              : <LineBlock lines={4} />}
          </div>
        </div>
      </Section>

      {/* PROCESS */}
      <Section pad={sectionPad} bg="var(--bg-2)">
        <SectionLabel>{sp.process.label}</SectionLabel>
        <h2 style={{ ...displayH2, fontSize: isMobile ? 'clamp(36px, 9vw, 60px)' : 'clamp(48px, 7vw, 84px)', marginBottom: 40 }}>
          {sp.process.heading}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}>
          {copy.process.map((p, i) => (
            <div key={p.name ?? p} style={{
              padding: isMobile ? 16 : 22,
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-3)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', color: 'var(--type-soft)' }}>
                  0{i + 1}
                </span>
                <span style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: ['var(--accent-yellow)', 'var(--accent-green)', 'var(--accent-red)', 'var(--accent-blue)'][i] ?? 'var(--line-2)',
                }} />
              </div>
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: isMobile ? 24 : 32,
                letterSpacing: '-0.02em',
                margin: '0 0 10px',
                paddingBottom: '0.06em',
              }}>
                {p.name ?? p}
              </div>
              {p.desc
                ? <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--type-soft)', margin: 0 }}>{p.desc}</p>
                : <LineBlock lines={2} />}
            </div>
          ))}
        </div>
      </Section>

      {/* INCLUDES */}
      <Section pad={sectionPad}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 'clamp(32px, 8vw, 54px)' : 'clamp(42px, 6vw, 64px)', margin: 0, letterSpacing: '-0.03em', paddingBottom: '0.06em' }}>
            {sp.includes.heading}
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {(service.includes || sp.includes.items).map((f, i) => (
            <div key={i} style={{
              padding: isMobile ? '20px 16px' : '26px 22px',
              borderRight: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
            }}>
              <span style={{
                fontFamily: 'var(--ui)',
                fontSize: 10,
                letterSpacing: '.2em',
                color: 'var(--type-soft)',
                display: 'block',
                marginBottom: 10,
              }}>
                F.0{i + 1}
              </span>
              <h3 style={{
                fontFamily: 'var(--display)',
                fontSize: isMobile ? 22 : 26,
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                fontWeight: 400,
                lineHeight: 1.2,
              }}>
                {f.name ?? f}
              </h3>
              {f.desc
                ? <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--type-soft)', margin: 0 }}>{f.desc}</p>
                : <LineBlock lines={2} />}
            </div>
          ))}
        </div>
      </Section>

      {/* CASES */}
      <Section pad={sectionPad}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: isMobile ? 32 : 60,
        }}>
          <div>
            <SectionLabel>{sp.useCases.label}</SectionLabel>
            <ul style={{
              margin: '18px 0 0',
              padding: 0,
              listStyle: 'none',
              fontFamily: 'var(--display)',
              fontSize: isMobile ? 22 : 26,
              lineHeight: 1.6,
              letterSpacing: '-0.015em',
            }}>
              {(service.useCases || sp.useCases.items).map(item => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>{sp.serviceFaq?.label}</SectionLabel>
            <div style={{
              display: 'grid',
              gap: 0,
              marginTop: 14,
            }}>
              {/* Se muestran todas: el slice(0, 2) descartaba la tercera
                  pregunta de cada servicio, que sí estaba escrita. */}
              {serviceFaqItems.map((item, i) => (
                <div
                  key={item.q}
                  style={{
                    padding: isMobile ? '12px 0' : '13px 0',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--ui)',
                    fontSize: 10,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    color: 'var(--type-soft)',
                    marginBottom: 6,
                  }}>
                    Q.0{i + 1}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--display)',
                    fontSize: isMobile ? 20 : 22,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    margin: '0 0 6px',
                    fontWeight: 400,
                  }}>
                    {item.q}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--type-soft)',
                    margin: 0,
                  }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* CONTEXTUAL CTA */}
      <section style={{
        padding: isMobile ? '70px 20px 60px' : '120px 36px',
        borderTop: '1px solid var(--line)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(50% 70% at 50% 100%, var(--glow), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(36px, 10vw, 70px)' : 'clamp(48px, 8vw, 100px)',
          lineHeight: 0.95,
          margin: '0 0 0',
          letterSpacing: '-0.035em',
          position: 'relative',
          paddingBottom: '0.1em',
        }}>
          {sp.ctaReady} {service.name.toLowerCase()}?
        </h2>
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          marginTop: isMobile ? 28 : 50,
          gap: 20,
        }}>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: isMobile ? 'clamp(22px, 6vw, 36px)' : 'clamp(28px, 4vw, 44px)',
            letterSpacing: '-0.025em',
            color: 'var(--type-soft)',
          }}>
            <span style={{ color: 'var(--type)' }}>{service.price}</span> · {service.time}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <RevealButton
              className="cta-breathe"
              onActivate={handleCheckout}
              style={{
                background: 'var(--type)',
                color: 'var(--bg)',
                padding: '16px 22px',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--ui)',
                fontSize: 12,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                flex: isMobile ? 1 : 'none',
                border: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sp.ctaStart} {service.name}
            </RevealButton>
            {PDF_MAP[service.code] && (
              <a
                href={PDF_MAP[service.code]}
                download
                style={{
                  fontFamily: 'var(--ui)',
                  fontSize: 12,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--type-soft)',
                  padding: '16px 20px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-pill)',
                  transition: 'border-color 0.2s, color 0.2s',
                  flex: isMobile ? 1 : 'none',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
              >
                {sp.downloadPdf ?? 'Descargar PDF'}
              </a>
            )}
          </div>
        </div>
      </section>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />

    </div>
  );
}

function Section({ children, bg, pad = '90px 36px' }) {
  return (
    <section style={{
      padding: pad,
      borderTop: '1px solid var(--line)',
      background: bg || 'transparent',
    }}>
      {children}
    </section>
  );
}

function SectionLabel({ children, color }) {
  return (
    <span style={{
      fontFamily: 'var(--ui)',
      fontSize: 11,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: color || 'var(--type-soft)',
      display: 'block',
      marginBottom: 14,
    }}>
      {children}
    </span>
  );
}

const displayH2 = {
  fontFamily: 'var(--display)',
  fontSize: 'clamp(36px, 5vw, 54px)',
  lineHeight: 1.05,
  margin: '0 0 20px',
  letterSpacing: '-0.025em',
  fontWeight: 400,
  paddingBottom: '0.06em',
};
