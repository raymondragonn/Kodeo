import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer from './Footer';
import PageMeta from './PageMeta';
import CallScheduler from './CallScheduler';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

export default function AppointmentPage({
  user, copy, motionSpeed = 1, onBack, onNavItemClick, onContact,
  onServiceClick, onAuthClick, onLogout, theme, onThemeToggle, onNavigate,
}) {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isMobile } = useBreakpoint();

  const { service, code } = location.state || {};
  const accent  = ACCENT[code] || ACCENT['01'];
  const calLink = import.meta.env.VITE_CAL_LINK || 'kodeo/consulta';

  const [booked, setBooked] = useState(false);

  // La consulta inicial ya no requiere cuenta ni formulario previo — se
  // agenda de inmediato como invitado. El webhook de Cal.com crea la cita
  // (ver cal-webhook.php) y se asocia al usuario cuando cree su cuenta con
  // el mismo correo. El formulario de proyecto se llena después, desde el
  // portal, una vez que el equipo lo libera tras la llamada. En vez de
  // saltar a /citas (que exige sesión) o dejar solo la confirmación interna
  // de Cal.com, mostramos aquí mismo un aviso propio.
  function handleBookingSuccess({ uid, startTime }) {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API}/confirm-appointment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, startTime, service, serviceCode: code, call_type: 'intro' }),
      }).catch(() => {
        // El webhook de Cal.com es el respaldo si esto falla
      });
    }
    setBooked(true);
  }

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

      <main style={{ padding: isMobile ? '50px 20px 70px' : '80px 36px 110px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em',
          textTransform: 'uppercase', color: 'var(--type-soft)', margin: '0 0 18px',
        }}>
          Consulta gratuita
        </p>

        <h1 style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: isMobile ? 'clamp(34px, 9vw, 52px)' : 'clamp(40px, 5vw, 64px)',
          lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 12px', paddingBottom: '0.08em',
        }}>
          {service || 'Agenda tu consulta'}
        </h1>

        <p style={{
          fontFamily: 'var(--body)', fontSize: 15, color: 'var(--type-soft)',
          maxWidth: 480, lineHeight: 1.55, margin: '0 0 40px',
        }}>
          Elige el horario que más te acomode. La llamada es completamente gratuita y sin compromiso.
        </p>

        <div style={{ height: 2, background: accent, width: 48, marginBottom: 36 }} />

        {booked ? (
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
                Cita confirmada
              </p>
              <h2 style={{
                fontFamily: 'var(--display)', fontWeight: 400,
                fontSize: isMobile ? 28 : 36, letterSpacing: '-0.025em',
                margin: '0 0 10px', lineHeight: 1.1,
              }}>
                ¡Tu cita se agendó correctamente!
              </h2>
              <p style={{
                fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
                margin: 0, maxWidth: 440, lineHeight: 1.6,
              }}>
                Te enviamos los detalles a tu correo electrónico. Para ver más información
                y darle seguimiento a tu proyecto, inicia sesión o crea una cuenta con el
                mismo correo.
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '13px 26px', background: 'var(--type)', color: 'var(--bg)',
                border: 0, borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                textTransform: 'uppercase', cursor: 'pointer',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              Ir a inicio
            </button>
          </div>
        ) : (
          <CallScheduler
            namespace="intro"
            calLink={calLink}
            metadata={{ callType: 'intro', serviceCode: code, service, userId: user?.id }}
            attendee={user ? { name: user.name, email: user.email } : undefined}
            theme={theme}
            onBookingSuccess={handleBookingSuccess}
          />
        )}
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
