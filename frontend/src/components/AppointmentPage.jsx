import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer from './Footer';
import PageMeta from './PageMeta';
import BookingCalendar from './BookingCalendar';
import { useBreakpoint } from '../hooks/useBreakpoint';

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
  otro: 'var(--type-soft)',
};

// Número de WhatsApp de Kodeo al que llega la solicitud de cita (formato
// internacional para wa.me: 52 + 10 dígitos, sin espacios ni "+")
const WA_PHONE = '522298483706';

export default function AppointmentPage({
  user, copy, motionSpeed = 1, onBack, onNavItemClick, onContact,
  onServiceClick, onAuthClick, onLogout, theme, onThemeToggle, onNavigate,
}) {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isMobile } = useBreakpoint();
  const bk           = copy.booking;
  const locale       = navigator.language || 'es-MX';

  // Si el usuario llega desde /comprar o desde una página de servicio ya
  // sabemos qué le interesa; si entra en frío se lo preguntamos (paso 1).
  const { service, code } = location.state || {};
  const [selected, setSelected] = useState(
    service ? { name: service, code: code || '01' } : null
  );
  const [slot, setSlot]     = useState(null);
  const [booked, setBooked] = useState(false);

  const accent = ACCENT[selected?.code] || ACCENT['01'];

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const buildWaLink = () => {
    const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    const msg = bk.waMessage
      .replace('{service}', selected.name)
      .replace('{date}', dateFmt.format(slot))
      .replace('{time}', timeFmt.format(slot));
    return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
  };

  // El cliente confirma la cita enviándonos el mensaje prellenado por
  // WhatsApp — no hay backend de por medio ni se requiere sesión.
  const handleConfirm = () => {
    window.open(buildWaLink(), '_blank', 'noopener');
    setBooked(true);
  };

  const handleChangeService = () => {
    setSelected(null);
    setSlot(null);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <PageMeta
        title="Agendar consulta | Kodeo"
        description="Agenda tu consulta inicial gratuita con el equipo de Kodeo."
        path="/agendar"
      />
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

      <main style={{ padding: isMobile ? '50px 20px 70px' : '80px 36px 110px', maxWidth: 980, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em',
          textTransform: 'uppercase', color: 'var(--type-soft)', margin: '0 0 18px',
        }}>
          {bk.eyebrow}
        </p>

        {booked ? (
          <SuccessPanel
            copy={bk.success}
            accent={accent}
            isMobile={isMobile}
            onResend={() => window.open(buildWaLink(), '_blank', 'noopener')}
            onHome={() => navigate('/')}
          />
        ) : !selected ? (
          <ServiceStep
            copy={bk.serviceStep}
            services={copy.services.list}
            isMobile={isMobile}
            onSelect={setSelected}
          />
        ) : (
          <>
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 400,
              fontSize: isMobile ? 'clamp(34px, 9vw, 52px)' : 'clamp(40px, 5vw, 64px)',
              lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 12px', paddingBottom: '0.08em',
            }}>
              {selected.name === bk.serviceStep.otherName ? bk.calendarStep.fallbackTitle : selected.name}
            </h1>

            <p style={{
              fontFamily: 'var(--body)', fontSize: 15, color: 'var(--type-soft)',
              maxWidth: 480, lineHeight: 1.55, margin: '0 0 14px',
            }}>
              {bk.calendarStep.sub}
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              marginBottom: 32,
            }}>
              <span style={{
                fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.16em',
                textTransform: 'uppercase', color: 'var(--type-soft)',
                border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
                padding: '7px 14px',
              }}>
                {bk.calendarStep.duration}
              </span>
              <button
                onClick={handleChangeService}
                style={{
                  background: 'transparent', border: 0, padding: 0,
                  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.16em',
                  textTransform: 'uppercase', color: 'var(--type-muted)',
                  cursor: 'pointer',
                }}
              >
                {bk.calendarStep.changeService}
              </button>
            </div>

            <div style={{ height: 2, background: accent, width: 48, marginBottom: 36 }} />

            <BookingCalendar
              locale={locale}
              accent={accent}
              copy={bk.calendarStep}
              isMobile={isMobile}
              selectedSlot={slot}
              onSelectSlot={setSlot}
            />

            {slot && (
              <ConfirmBar
                copy={bk.calendarStep}
                serviceLabel={bk.calendarStep.selectedService}
                serviceName={selected.name}
                slot={slot}
                locale={locale}
                accent={accent}
                isMobile={isMobile}
                onConfirm={handleConfirm}
              />
            )}
          </>
        )}
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}

/* ─── Paso 1: ¿qué servicio te interesa? ───────────────────────────── */

function ServiceStep({ copy, services, isMobile, onSelect }) {
  const options = [
    ...services.map((svc) => ({ name: svc.name, code: svc.code, lead: svc.lead })),
    { name: copy.otherName, code: 'otro', lead: copy.otherLead },
  ];

  return (
    <>
      <h1 style={{
        fontFamily: 'var(--display)', fontWeight: 400,
        fontSize: isMobile ? 'clamp(34px, 9vw, 52px)' : 'clamp(40px, 5vw, 64px)',
        lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 12px', paddingBottom: '0.08em',
      }}>
        {copy.title}
      </h1>
      <p style={{
        fontFamily: 'var(--body)', fontSize: 15, color: 'var(--type-soft)',
        maxWidth: 480, lineHeight: 1.55, margin: '0 0 44px',
      }}>
        {copy.sub}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 14,
      }}>
        {options.map((opt) => (
          <button
            key={opt.code}
            onClick={() => onSelect({ name: opt.name, code: opt.code })}
            style={{
              textAlign: 'left', cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
              padding: isMobile ? '22px 20px' : '26px 26px',
              display: 'flex', flexDirection: 'column', gap: 10,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)';
              e.currentTarget.style.borderColor = ACCENT[opt.code];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--line)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: 'var(--display)', fontWeight: 400,
                fontSize: isMobile ? 24 : 28, letterSpacing: '-0.02em',
                color: 'var(--type)', lineHeight: 1.1,
              }}>
                {opt.name}
              </span>
              <span style={{ color: ACCENT[opt.code], fontSize: 18 }}>→</span>
            </div>
            <p style={{
              fontFamily: 'var(--body)', fontSize: 13, lineHeight: 1.55,
              color: 'var(--type-soft)', margin: 0,
            }}>
              {opt.lead}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ─── Resumen + botón de confirmación ──────────────────────────────── */

function ConfirmBar({ copy, serviceLabel, serviceName, slot, locale, accent, isMobile, onConfirm }) {
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div style={{
      marginTop: 20,
      border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
      padding: isMobile ? '20px 18px' : '22px 28px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between', gap: 18,
    }}>
      <div>
        <p style={{
          fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em',
          textTransform: 'uppercase', color: accent, margin: '0 0 6px',
        }}>
          {serviceLabel}: {serviceName}
        </p>
        <p style={{
          fontFamily: 'var(--display)', fontSize: isMobile ? 20 : 24,
          letterSpacing: '-0.02em', margin: 0, textTransform: 'capitalize',
        }}>
          {dateFmt.format(slot)} · {timeFmt.format(slot)}
        </p>
        <p style={{
          fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)',
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          {copy.confirmHint}
        </p>
      </div>

      <button
        onClick={onConfirm}
        style={{
          padding: '15px 28px', background: 'var(--type)', color: 'var(--bg)',
          border: 0, borderRadius: 'var(--radius-pill)',
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
          textTransform: 'uppercase', cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {copy.confirm}
      </button>
    </div>
  );
}

/* ─── Confirmación final ───────────────────────────────────────────── */

function SuccessPanel({ copy, accent, isMobile, onResend, onHome }) {
  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      padding: isMobile ? '40px 24px' : '56px 48px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24,
    }}>
      <div>
        <p style={{
          fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em',
          textTransform: 'uppercase', color: accent, margin: '0 0 10px',
        }}>
          {copy.label}
        </p>
        <h2 style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: isMobile ? 28 : 36, letterSpacing: '-0.025em',
          margin: '0 0 10px', lineHeight: 1.1,
        }}>
          {copy.title}
        </h2>
        <p style={{
          fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
          margin: 0, maxWidth: 460, lineHeight: 1.6,
        }}>
          {copy.body}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
        <button
          onClick={onResend}
          style={{
            padding: '13px 26px', background: 'var(--type)', color: 'var(--bg)',
            border: 0, borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {copy.resend}
        </button>
        <button
          onClick={onHome}
          style={{
            padding: '13px 26px', background: 'transparent', color: 'var(--type)',
            border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {copy.home}
        </button>
      </div>
    </div>
  );
}
