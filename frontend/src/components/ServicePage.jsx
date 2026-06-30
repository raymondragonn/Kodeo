import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from './Footer';
import Nav from './Nav';
import { useBreakpoint } from '../hooks/useBreakpoint';
const incupCover       = '/assets/projects/incup/incup-mockup-cover.png';
const tudiCover        = '/assets/projects/tudi/tudi-mockup-cover.png';
const ferbodaCover     = '/assets/projects/ferboda/ferboda-mockup-cover.png';
const stratpharmaCover = '/assets/projects/stratpharma/stratpharma-mockup-cover.png';
const aramondraCover   = '/assets/projects/aramondra/aramondra-mockup-cover.png';

const landingPdf  = '/LANDING PAGE - KODEO.pdf';
const sitioWebPdf = '/SITIO WEB - KODEO.pdf';
const tiendaPdf   = '/TIENDA ONLINE - KODEO.pdf';

gsap.registerPlugin(ScrollTrigger);

const PROJECT_COVERS = {
  '01': incupCover,
  '02': tudiCover,
  '03': ferbodaCover,
  '04': stratpharmaCover,
  '05': aramondraCover,
};

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

const PDF_MAP = { '01': landingPdf, '02': sitioWebPdf, '03': tiendaPdf };

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
    const amount = Number(service.price.replace(/[^\d]/g, '')) * 100;
    navigate('/agendar', { state: { amount, service: service.name, code: service.code } });
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
  const relatedLimit = isMobile ? 2 : 3;
  const matchingProjects = copy.projects.items.filter(p => p.serviceCodes?.includes(service.code));
  const relatedProjects = (matchingProjects.length ? matchingProjects : copy.projects.items).slice(0, relatedLimit);
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
      <section ref={heroRef} style={{ padding: isMobile ? '40px 20px 60px' : '60px 36px 90px', position: 'relative' }}>
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
              alignItems: 'center',
            }}>
              {[
                [sp.specs.delivery,   service.time],
                [sp.specs.investment, service.price],
              ].map(([dt, dd]) => (
                <>
                  <dt key={`dt-${dt}`} style={{ color: 'var(--type-soft)' }}>{dt}</dt>
                  <dd key={`dd-${dt}`} style={{ margin: 0, color: 'var(--type)' }}>{dd}</dd>
                </>
              ))}
            </dl>
            {PDF_MAP[service.code] && (
              <a
                href={PDF_MAP[service.code]}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 20,
                  fontFamily: 'var(--ui)',
                  fontSize: 11,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--type-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 16px',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
              >
                ↓ {sp.downloadPdf ?? 'Descargar PDF'}
              </a>
            )}
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
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
            {String((service.includes || sp.includes.items).length).padStart(2, '0')} {sp.includes.count.replace(/^\d+\s*/, '')}
          </span>
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
              {serviceFaqItems.slice(0, 2).map((item, i) => (
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
                ↓ {sp.downloadPdf ?? 'Descargar PDF'}
              </a>
            )}
            <a href={`mailto:${copy.cta.email}`} style={{
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
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
            >
              {copy.cta.email}
            </a>
            <button
              onClick={handleCheckout}
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
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {sp.ctaStart} →
            </button>
          </div>
        </div>
      </section>

      {/* RELATED PROJECTS */}
      <Section pad={sectionPad}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 'clamp(28px, 7vw, 44px)' : 'clamp(36px, 5vw, 54px)', margin: 0, letterSpacing: '-0.025em', fontWeight: 400 }}>
            {sp.related.heading}
          </h2>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
            {sp.related.count}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? 20 : 22 }}>
          {relatedProjects.map(p => (
            <a
              key={p.idx}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--line)', height: isMobile ? 180 : 240, position: 'relative', background: 'var(--card-frost)' }}>
                {PROJECT_COVERS[p.idx] && (
                  <img
                    src={PROJECT_COVERS[p.idx]}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
                <span>{p.idx}</span><span>{p.tag}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 22 : 26, margin: '4px 0 0', letterSpacing: '-0.02em', fontWeight: 400 }}>
                {p.name}
              </h3>
            </a>
          ))}
        </div>
      </Section>

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
