import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cal, { getCalApi } from '@calcom/embed-react';
import Nav from './Nav';
import Footer from './Footer';
import PageMeta from './PageMeta';
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

  const { service, code, amount } = location.state || {};
  const accent  = ACCENT[code] || ACCENT['01'];
  const calLink = import.meta.env.VITE_CAL_LINK || 'kodeo/consulta';

  // Escuchar reserva exitosa — solo cuando hay sesión
  useEffect(() => {
    if (!user) return;
    (async () => {
      const cal = await getCalApi({ namespace: '45min' });
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: async (e) => {
          const { uid, startTime } = e.detail?.data || {};
          const token = localStorage.getItem('token');
          if (uid && token) {
            try {
              await fetch(`${API}/confirm-appointment.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid, startTime, service, serviceCode: code }),
              });
            } catch {
              // El webhook de Cal.com es el respaldo si esto falla
            }
          }
          navigate('/panel', { state: { justBooked: true } });
        },
      });
    })();
  }, [user, navigate, service, code]);

  const calLinkWithParams = user
    ? `${calLink}?metadata[userId]=${user.id}&metadata[serviceCode]=${encodeURIComponent(code || '')}&metadata[service]=${encodeURIComponent(service || '')}`
    : calLink;

  const authReturnState = { from: '/agendar', returnState: location.state };

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

        {/* ── Sin sesión: gate de autenticación ── */}
        {!user && (
          <div style={{
            border: '1px solid var(--line)',
            padding: isMobile ? '40px 24px' : '56px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24,
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em',
                textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 10px',
              }}>
                Paso 1 de 2
              </p>
              <h2 style={{
                fontFamily: 'var(--display)', fontWeight: 400,
                fontSize: isMobile ? 28 : 36, letterSpacing: '-0.025em',
                margin: '0 0 10px', lineHeight: 1.1,
              }}>
                Crea tu cuenta o inicia sesión
              </h2>
              <p style={{
                fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
                margin: 0, maxWidth: 420, lineHeight: 1.6,
              }}>
                Necesitamos identificarte para asociar la cita a tu perfil y mantenerte
                al tanto del proceso.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <button
                onClick={() => navigate('/register', { state: authReturnState })}
                style={{
                  padding: '13px 26px', background: 'var(--type)', color: 'var(--bg)',
                  border: 0, borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  flex: isMobile ? 1 : 'none',
                }}
              >
                Crear cuenta →
              </button>
              <button
                onClick={() => navigate('/login', { state: authReturnState })}
                style={{
                  padding: '13px 26px', background: 'transparent', color: 'var(--type)',
                  border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  flex: isMobile ? 1 : 'none',
                }}
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        )}

        {/* ── Con sesión: calendario Cal.com ── */}
        {user && (
          <div style={{ border: '1px solid var(--line)', overflow: 'hidden', minHeight: 600 }}>
            <Cal
              namespace="45min"
              calLink={calLinkWithParams}
              config={{
                name: user.name,
                email: user.email,
                theme: theme === 'dark' ? 'dark' : 'light',
              }}
              style={{ width: '100%', height: '100%', minHeight: 600 }}
            />
          </div>
        )}
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
