import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import PageMeta from './PageMeta';
import RefreshButton from './RefreshButton';
import ViewModeSwitch from './ViewModeSwitch';
import CallScheduler from './CallScheduler';
import FormField from './ProjectDetailsField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';
import { OPTION_LABELS, getFieldsForService, inputStyle } from '../data/projectFormFields';

const CAL_LINK = import.meta.env.VITE_CAL_LINK || 'kodeo/consulta';

const STATUS_LABELS = {
  pending:        { label: 'Pendiente',        color: 'var(--type-muted)' },
  confirmed:      { label: 'Confirmada',       color: '#63C44D' },
  cancelled:      { label: 'Cancelada',        color: '#e05050' },
  rescheduled:    { label: 'Reprogramada',     color: '#FFDE59' },
  form_submitted: { label: 'Formulario enviado', color: '#5170ff' },
  completado:     { label: 'Completado',       color: '#63C44D' },
};

const CALL_TYPE_LABELS = {
  intro:         'Consulta inicial',
  design_review: 'Revisión de diseño',
  delivery:      'Entrega',
};

const SERVICE_BASE = { '01': 6500, '02': 10000, '03': 12000 };

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

// Estado visible de un proyecto: superpone pago/formulario sobre el status
// crudo de la fila para que el mosaico y la tabla no requieran abrir el
// detalle para saber en qué paso va.
function getStatusInfo(appointment) {
  const isPaid      = !!appointment.stripe_payment_intent_id;
  const isCompleted = appointment.status === 'completado';
  if (isCompleted) return { label: 'Completado', color: '#63C44D' };
  if (isPaid)      return { label: 'Pagado', color: '#63C44D' };
  if (Number(appointment.payment_enabled) === 1) return { label: 'Pago habilitado', color: '#63C44D' };
  if (appointment.form_released && !appointment.project_details) return { label: 'Formulario disponible', color: '#5170ff' };
  return STATUS_LABELS[appointment.status] || { label: appointment.status, color: 'var(--type-muted)' };
}

// ── Preguntas de la encuesta ───────────────────────────────────────────────

const SURVEY_QUESTIONS = [
  {
    key: 'satisfaction',
    label: '¿Qué tan satisfecho estás con el resultado?',
    type: 'rating',
    required: true,
  },
  {
    key: 'communication',
    label: '¿Cómo calificarías la comunicación durante el proyecto?',
    type: 'rating',
    required: true,
  },
  {
    key: 'highlight',
    label: '¿Qué fue lo que más te gustó?',
    type: 'textarea',
    placeholder: 'El diseño, los tiempos, la atención…',
    required: true,
  },
  {
    key: 'improve',
    label: '¿Qué podríamos haber hecho mejor? (opcional)',
    type: 'textarea',
    placeholder: 'Tu opinión nos ayuda a mejorar…',
    required: false,
  },
  {
    key: 'recommend',
    label: '¿Recomendarías Kodeo?',
    type: 'radio',
    options: [
      { value: 'yes',   label: 'Sí, sin duda' },
      { value: 'maybe', label: 'Tal vez' },
      { value: 'no',    label: 'No por ahora' },
    ],
    required: true,
  },
];

// ── Página principal ───────────────────────────────────────────────────────

export default function ClientDashboard({
  user, copy, onLogout, theme, onThemeToggle, onNavigate,
}) {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isMobile } = useBreakpoint();
  const token        = localStorage.getItem('token');
  const pollRef      = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);
  const [view, setView]                 = useState('grid');
  const [appointmentsView, setAppointmentsView] = useState('mosaico'); // 'mosaico' | 'tabla'
  const [selectedId, setSelectedId]     = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAppointments().then(count => {
      if (location.state?.justBooked) {
        // El webhook llega ~1-2s después — hacemos polling hasta que aparezca la cita nueva
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          const fresh = await fetchAppointments(true);
          if (fresh > count || attempts >= 6) {
            clearInterval(pollRef.current);
          }
        }, 2000);
      }
    });
    return () => clearInterval(pollRef.current);
  }, [user]);

  // Devuelve el número de citas para el polling. silent=true evita el spinner.
  async function fetchAppointments(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(`${API}/appointments.php`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        // Sesión expirada o token de una clave de firma anterior — se cierra
        // sesión en vez de dejar al usuario viendo el error crudo del backend.
        onLogout();
        navigate('/login');
        return 0;
      }
      if (data.error) throw new Error(data.error);
      const list = data.appointments || [];
      setAppointments(list);
      return list.length;
    } catch (e) {
      setError(e.message);
      return 0;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  if (!user) return null;

  const isAdmin = user.role === 'administrador';
  // Cada proyecto es una fila call_type='intro'; las llamadas de revisión de
  // diseño y entrega son filas ligeras enlazadas por project_id, nunca se
  // muestran como tarjetas propias.
  const projects            = appointments.filter(a => a.call_type === 'intro');
  const selectedAppointment = projects.find(a => a.id === selectedId) || null;

  function handleSelect(appointment) {
    setSelectedId(appointment.id);
    setView('detail');
  }

  function handleBack() {
    setView('grid');
    setSelectedId(null);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAppointments(true);
    setRefreshing(false);
  }

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <PageMeta
        title="Citas | Kodeo"
        description="Administra tus citas y proyectos con Kodeo."
        path="/citas"
      />

      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px' }}>
        {(isAdmin || view === 'grid') && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div>
                {isAdmin && (
                  <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 6px' }}>
                    Panel de gestión
                  </p>
                )}
                <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                  Citas
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                {!isAdmin && !loading && !error && projects.length > 0 && (
                  <ViewModeSwitch
                    value={appointmentsView}
                    onChange={setAppointmentsView}
                    options={[
                      { id: 'mosaico', label: 'Mosaico', icon: 'grid' },
                      { id: 'tabla',   label: 'Tabla',   icon: 'list' },
                    ]}
                  />
                )}
                <RefreshButton onClick={handleRefresh} loading={refreshing} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {isAdmin
                ? 'Da seguimiento a las citas agendadas por tus clientes.'
                : 'Selecciona una cita para ver los detalles del proyecto que compartiste al agendar.'}
            </p>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '6px 0 0' }}>
                {projects.length} cita{projects.length !== 1 ? 's' : ''} en total
              </p>
            )}
          </div>
        )}

        {!isAdmin && view === 'detail' && selectedAppointment && (
          <AppointmentDetailHeader appointment={selectedAppointment} onBack={handleBack} isMobile={isMobile} />
        )}

        {loading && <p style={{ color: 'var(--type-muted)', fontFamily: 'var(--body)', fontSize: 14 }}>Cargando…</p>}
        {error   && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 14 }}>{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <EmptyState isAdmin={isAdmin} onNavigate={navigate} />
        )}

        {!loading && !error && projects.length > 0 && (
          isAdmin ? (
            <AdminView projects={projects} allAppointments={appointments} token={token} onRefresh={fetchAppointments} isMobile={isMobile} theme={theme} />
          ) : view === 'detail' && selectedAppointment ? (
            <AppointmentClientCard
              appointment={selectedAppointment}
              calls={appointments.filter(a => a.project_id === selectedAppointment.id)}
              token={token}
              navigate={navigate}
              onRefresh={fetchAppointments}
              theme={theme}
              user={user}
            />
          ) : appointmentsView === 'tabla' ? (
            <AppointmentsTable appointments={projects} onSelect={handleSelect} isMobile={isMobile} />
          ) : (
            <AppointmentsGrid appointments={projects} onSelect={handleSelect} isMobile={isMobile} />
          )
        )}
      </div>
    </PortalLayout>
  );
}

// ── Vista Cliente: mosaico de citas ─────────────────────────────────────────

function AppointmentsGrid({ appointments, onSelect, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
      {appointments.map(appointment => (
        <AppointmentGridCard key={appointment.id} appointment={appointment} onSelect={onSelect} />
      ))}
    </div>
  );
}

function AppointmentGridCard({ appointment, onSelect }) {
  const [hovered, setHovered] = useState(false);

  const accent      = ACCENT[appointment.service_code] || ACCENT['01'];
  const statusInfo  = getStatusInfo(appointment);
  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    : 'Sin fecha asignada';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-2)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color .2s, transform .15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ height: 4, background: statusInfo.color === '#63C44D' ? '#63C44D' : accent, flexShrink: 0 }} />

      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
            {appointment.service || 'Cita'}
          </span>
          <span style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
            color: statusInfo.color, border: `1px solid ${statusInfo.color}`,
            borderRadius: 'var(--radius-pill)', padding: '3px 8px', flexShrink: 0,
          }}>
            {statusInfo.label}
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 52 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', lineHeight: 1.25, display: 'block' }}>
            {scheduledDate}
          </span>
        </div>

        <button
          onClick={() => onSelect(appointment)}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
            color: 'var(--type-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color .2s, color .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = accent;
            e.currentTarget.style.color = 'var(--type)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--type-soft)';
          }}
        >
          <span>Ver detalles</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Vista Cliente: tabla de citas ───────────────────────────────────────────

const thStyle = {
  textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap',
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
  color: 'var(--type-muted)',
};

const tdStyle = {
  padding: '14px 16px', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)',
};

function AppointmentsTable({ appointments, onSelect, isMobile }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 560 : 'auto' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>Servicio</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Fecha y hora</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appointment => (
              <AppointmentTableRow key={appointment.id} appointment={appointment} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppointmentTableRow({ appointment, onSelect }) {
  const [hovered, setHovered] = useState(false);

  const statusInfo  = getStatusInfo(appointment);
  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    : 'Sin fecha asignada';

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: '1px solid var(--line)', background: hovered ? 'var(--bg-2)' : 'transparent', transition: 'background .15s' }}
    >
      <td style={tdStyle}>{appointment.service || 'Cita'}</td>
      <td style={tdStyle}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
          color: statusInfo.color, border: `1px solid ${statusInfo.color}`,
          borderRadius: 'var(--radius-pill)', padding: '3px 8px',
        }}>
          {statusInfo.label}
        </span>
      </td>
      <td style={tdStyle}>{scheduledDate}</td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <button
          onClick={() => onSelect(appointment)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
            padding: '7px 14px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--line)', background: 'transparent', color: 'var(--type-soft)', cursor: 'pointer',
            transition: 'border-color .2s, color .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
        >
          Ver detalles
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ── Vista Cliente: encabezado de detalle ────────────────────────────────────

function AppointmentDetailHeader({ appointment, onBack, isMobile }) {
  const statusInfo  = getStatusInfo(appointment);
  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    : null;

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase',
          color: 'var(--type-muted)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '0 0 10px', transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--type-muted)'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Citas
      </button>

      <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: statusInfo.color, margin: '0 0 4px' }}>
        {statusInfo.label}
      </p>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
        {appointment.service || 'Cita'}
      </h1>
      {scheduledDate && (
        <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '6px 0 0' }}>
          {scheduledDate}
        </p>
      )}
    </div>
  );
}

function AppointmentClientCard({ appointment, calls, token, navigate, onRefresh, theme, user }) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  const accent        = ACCENT[appointment.service_code] || ACCENT['01'];
  const statusInfo    = getStatusInfo(appointment);
  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    : null;

  const isPaid       = !!appointment.stripe_payment_intent_id;
  const isCompleted  = appointment.status === 'completado';
  const hasFeedback  = !!appointment.feedback;

  const needsForm               = !!appointment.form_released && !appointment.project_details;
  const designReviewCall        = calls.find(c => c.call_type === 'design_review');
  const canScheduleDesignReview = !!appointment.project_details && !designReviewCall;

  function handlePay() {
    navigate('/pago', {
      state: {
        amount: Math.round((appointment.amount || 0) * 100),
        service: appointment.service,
        code: appointment.service_code,
        appointmentId: appointment.id,
      },
    });
  }

  async function handleDetailsSubmit(values) {
    const res  = await fetch(`${API}/appointments.php?id=${appointment.id}&action=details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project_details: JSON.stringify(values) }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    onRefresh();
  }

  function handleDesignReviewBooked({ uid, startTime }) {
    fetch(`${API}/confirm-appointment.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        uid, startTime, service: appointment.service, serviceCode: appointment.service_code,
        call_type: 'design_review', project_id: appointment.id,
      }),
    }).catch(() => {
      // El webhook de Cal.com es el respaldo si esto falla
    }).finally(() => onRefresh());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ── Datos de la cita ── */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ height: 3, background: isPaid ? '#63C44D' : accent }} />
        <InfoRow label="Servicio">{appointment.service || '—'}</InfoRow>
        <InfoRow label="Estado">
          <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
        </InfoRow>
        {scheduledDate && <InfoRow label="Fecha y hora">{scheduledDate}</InfoRow>}
        {(appointment.payment_enabled == 1 || isPaid) && (
          <InfoRow label={isPaid ? 'Monto pagado' : 'Monto a pagar'}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: isPaid ? '#63C44D' : 'var(--type)' }}>
              {Number(appointment.amount || 0).toLocaleString('es-MX', {
                style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0,
              })}
            </span>
          </InfoRow>
        )}
      </div>

      {/* ── Banner de pago / completado ── */}
      {isPaid && (
        <div style={{
          border: '1px solid #63C44D', borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{isCompleted ? '★' : '✓'}</span>
          <div>
            <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#63C44D', margin: '0 0 4px' }}>
              {isCompleted ? 'Proyecto completado' : 'Pago recibido'}
            </p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0 }}>
              {isCompleted
                ? 'Tu proyecto ha finalizado. ¡Gracias por confiar en Kodeo!'
                : 'Tu proyecto está en marcha. Te notificaremos sobre el avance.'}
            </p>
          </div>
        </div>
      )}

      {!isPaid && appointment.payment_enabled == 1 && (
        <div style={{
          border: `1px solid ${accent}`, borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)', margin: '0 0 4px' }}>
              Tu pago está listo
            </p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0 }}>
              El equipo de Kodeo ha habilitado tu acceso al pago.
            </p>
          </div>
          <button
            onClick={handlePay}
            style={{
              padding: '13px 28px', background: 'var(--type)', color: 'var(--bg)',
              border: 0, borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            Pagar ahora →
          </button>
        </div>
      )}

      {/* ── Formulario de proyecto (liberado tras la llamada inicial) ── */}
      {needsForm && (
        <div>
          <p style={eyebrowStyle}>Cuéntanos sobre tu proyecto</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            El equipo ya revisó tu llamada inicial — completa este formulario para continuar
            y poder agendar la revisión de diseño.
          </p>
          <ProjectIntakeForm serviceCode={appointment.service_code} onSubmit={handleDetailsSubmit} />
        </div>
      )}

      {/* ── Detalles ya enviados (solo lectura) ── */}
      {appointment.project_details && (
        <div>
          <p style={eyebrowStyle}>Detalles del proyecto</p>
          <SubmittedDetails project_details={appointment.project_details} serviceCode={appointment.service_code} />
        </div>
      )}

      {/* ── Agendar revisión de diseño ── */}
      {canScheduleDesignReview && (
        <div>
          <p style={eyebrowStyle}>Agenda tu revisión de diseño</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Elige el horario que más te acomode para mostrarte la propuesta de diseño.
          </p>
          <CallScheduler
            namespace="design_review"
            calLink={CAL_LINK}
            metadata={{
              callType: 'design_review', projectId: appointment.id, userId: user?.id,
              serviceCode: appointment.service_code, service: appointment.service,
            }}
            attendee={{ name: user?.name, email: user?.email }}
            theme={theme}
            onBookingSuccess={handleDesignReviewBooked}
          />
        </div>
      )}

      {/* ── Llamadas del proyecto ── */}
      {calls.length > 0 && (
        <div>
          <p style={eyebrowStyle}>Llamadas</p>
          <CallsTimeline calls={calls} />
        </div>
      )}

      {/* ── Encuesta de satisfacción (solo cuando está completado) ── */}
      {isCompleted && (
        <div>
          <p style={eyebrowStyle}>Tu opinión</p>
          {hasFeedback || feedbackSent ? (
            <div style={{
              border: '1px solid #63C44D', borderRadius: 'var(--radius-lg)', padding: '28px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
            }}>
              <span style={{ fontSize: 28 }}>★</span>
              <p style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: '#63C44D', margin: 0 }}>
                ¡Gracias por tu opinión!
              </p>
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0, maxWidth: 340, lineHeight: 1.6 }}>
                Tu retroalimentación nos ayuda a seguir mejorando para futuros clientes.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
                Cuéntanos cómo fue tu experiencia. Solo toma un momento y nos ayuda mucho.
              </p>
              <SurveyForm
                appointmentId={appointment.id}
                token={token}
                onSubmitted={() => setFeedbackSent(true)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulario de detalles del proyecto (post-llamada inicial) ────────────

function ProjectIntakeForm({ serviceCode, onSubmit }) {
  const fields  = getFieldsForService(serviceCode);
  const initial = Object.fromEntries(fields.map(f => [f.key, f.type === 'link-list' ? [] : '']));
  const [form, setForm]     = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  const isComplete = fields
    .filter(f => f.required)
    .every(f => form[f.key]?.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isComplete || saving) return;
    // Los campos link-list llegan con filas vacías del propio input dinámico
    // — se limpian antes de guardar para no persistir enlaces en blanco.
    const cleaned = { ...form };
    fields.forEach(f => {
      if (f.type === 'link-list') {
        cleaned[f.key] = (Array.isArray(form[f.key]) ? form[f.key] : [])
          .map(s => s.trim())
          .filter(Boolean);
      }
    });
    setSaving(true); setError(null);
    try {
      await onSubmit(cleaned);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '32px 28px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {fields.map(field => (
          <FormField
            key={field.key}
            field={field}
            value={form[field.key]}
            onChange={v => set(field.key, v)}
          />
        ))}

        {error && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={!isComplete || saving}
          style={{
            alignSelf: 'flex-start',
            padding: '13px 28px',
            background: isComplete ? 'var(--type)' : 'var(--bg-3)',
            color: isComplete ? 'var(--bg)' : 'var(--type-muted)',
            border: isComplete ? 0 : '1px solid var(--line)',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
            cursor: (!isComplete || saving) ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {saving ? 'Enviando…' : 'Enviar →'}
        </button>
      </form>
    </div>
  );
}

// ── Bitácora de llamadas del proyecto ──────────────────────────────────────

function CallsTimeline({ calls }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {calls.map((call, i) => {
        const date = call.scheduled_at
          ? new Date(call.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })
          : 'Sin fecha';
        const info = STATUS_LABELS[call.status] || { label: call.status, color: 'var(--type-muted)' };
        return (
          <div
            key={call.id}
            style={{
              padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', margin: '0 0 2px' }}>
                {CALL_TYPE_LABELS[call.call_type] || call.call_type}
              </p>
              <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: 0 }}>{date}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
                color: info.color, border: `1px solid ${info.color}`, borderRadius: 'var(--radius-pill)', padding: '3px 8px',
              }}>
                {info.label}
              </span>
              {call.video_url && (
                <a
                  href={call.video_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type-soft)' }}
                >
                  Unirse →
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Encuesta de satisfacción ───────────────────────────────────────────────

function SurveyForm({ appointmentId, token, onSubmitted }) {
  const initial = Object.fromEntries(SURVEY_QUESTIONS.map(q => [q.key, '']));
  const [form, setForm]     = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  const isComplete = SURVEY_QUESTIONS
    .filter(q => q.required)
    .every(q => form[q.key]?.toString().trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isComplete) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/appointments.php?id=${appointmentId}&action=feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feedback: JSON.stringify(form) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSubmitted();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {SURVEY_QUESTIONS.map(q => {
        if (q.type === 'rating') {
          return (
            <div key={q.key}>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 14 }}>
                {q.label}
                {q.required && <span style={{ color: '#e05050', marginLeft: 4 }}>*</span>}
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const selected = Number(form[q.key]) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set(q.key, String(n))}
                      style={{
                        width: 44, height: 44,
                        background: selected ? '#63C44D' : 'transparent',
                        color: selected ? '#000' : 'var(--type-soft)',
                        border: selected ? '1px solid #63C44D' : '1px solid var(--line)',
                        borderRadius: '50%',
                        fontFamily: 'var(--display)', fontSize: 16,
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, maxWidth: 262 }}>
                <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>Malo</span>
                <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>Excelente</span>
              </div>
            </div>
          );
        }

        if (q.type === 'textarea') {
          return (
            <div key={q.key}>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 8 }}>
                {q.label}
                {q.required && <span style={{ color: '#e05050', marginLeft: 4 }}>*</span>}
              </label>
              <textarea
                value={form[q.key]}
                onChange={e => set(q.key, e.target.value)}
                placeholder={q.placeholder}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
            </div>
          );
        }

        if (q.type === 'radio') {
          return (
            <div key={q.key}>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 12 }}>
                {q.label}
                {q.required && <span style={{ color: '#e05050', marginLeft: 4 }}>*</span>}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {q.options.map(opt => {
                  const selected = form[q.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set(q.key, opt.value)}
                      style={{
                        padding: '9px 18px',
                        background: selected ? 'var(--type)' : 'transparent',
                        color: selected ? 'var(--bg)' : 'var(--type-soft)',
                        border: selected ? '1px solid var(--type)' : '1px solid var(--line)',
                        borderRadius: 'var(--radius-pill)',
                        fontFamily: 'var(--body)', fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                        letterSpacing: 0, textTransform: 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return null;
      })}

      {error && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={saving || !isComplete}
        style={{
          alignSelf: 'flex-start',
          padding: '13px 28px',
          background: isComplete ? '#63C44D' : 'var(--bg-3)',
          color: isComplete ? '#000' : 'var(--type-muted)',
          border: 0,
          borderRadius: 'var(--radius-pill)',
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
          cursor: (saving || !isComplete) ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {saving ? 'Enviando…' : 'Enviar opinión →'}
      </button>
    </form>
  );
}

// ── Detalles ya enviados (solo lectura) ────────────────────────────────────

function SubmittedDetails({ project_details, serviceCode }) {
  let parsed = null;
  try { parsed = project_details ? JSON.parse(project_details) : null; } catch { parsed = null; }

  if (!project_details) {
    return (
      <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', lineHeight: 1.6 }}>
        No se registraron detalles del proyecto para esta cita.
      </p>
    );
  }

  if (!parsed) {
    return (
      <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {project_details}
      </p>
    );
  }

  const fields = getFieldsForService(serviceCode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {fields.map((field, i) => {
        const val = parsed[field.key];
        const isEmpty = Array.isArray(val) ? val.length === 0 : !val;
        if (isEmpty) return null;
        const optLabels = OPTION_LABELS[field.key];
        return (
          <div
            key={field.key}
            style={{
              padding: '14px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
            }}
          >
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', flexShrink: 0, paddingTop: 2 }}>
              {field.label.replace(' (opcional)', '')}
            </span>
            {field.type === 'link-list' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {/* Citas guardadas antes de este campo tener soporte para varios enlaces
                    guardaron reference_url como texto plano, no arreglo */}
                {(Array.isArray(val) ? val : [val]).map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                     style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', textAlign: 'right', lineHeight: 1.5, wordBreak: 'break-all' }}>
                    {url}
                  </a>
                ))}
              </div>
            ) : (
              <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', textAlign: 'right', lineHeight: 1.5 }}>
                {optLabels ? (optLabels[val] || val) : val}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Vista Admin ────────────────────────────────────────────────────────────

function AdminView({ projects, allAppointments, token, onRefresh, isMobile, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {projects.map(apt => (
        <AppointmentAdminCard
          key={apt.id}
          appointment={apt}
          calls={allAppointments.filter(a => a.project_id === apt.id)}
          token={token}
          onRefresh={onRefresh}
          isMobile={isMobile}
          theme={theme}
        />
      ))}
    </div>
  );
}

function AppointmentAdminCard({ appointment, calls, token, onRefresh, isMobile, theme }) {
  const [open, setOpen]               = useState(false);
  const [amount, setAmount]           = useState(
    appointment.amount ? String(parseFloat(appointment.amount)) : String(SERVICE_BASE[appointment.service_code] || '')
  );
  const [enabling, setEnabling]       = useState(false);
  const [enabled, setEnabled]         = useState(Number(appointment.payment_enabled) === 1);
  const [enableError, setEnableError] = useState(null);
  const [completing, setCompleting]   = useState(false);
  const [completeError, setCompleteError] = useState(null);
  const [releasingForm, setReleasingForm] = useState(false);
  const [formReleased, setFormReleased]   = useState(!!appointment.form_released);
  const [releaseError, setReleaseError]   = useState(null);
  const [showDeliveryScheduler, setShowDeliveryScheduler] = useState(false);

  const accent      = ACCENT[appointment.service_code] || ACCENT['01'];
  const isPaid      = !!appointment.stripe_payment_intent_id;
  const isCompleted = appointment.status === 'completado';
  const deliveryCall = calls.find(c => c.call_type === 'delivery');

  const statusInfo = getStatusInfo(appointment);

  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    : 'Sin fecha';

  let parsedDetails = null;
  try { parsedDetails = appointment.project_details ? JSON.parse(appointment.project_details) : null; } catch { parsedDetails = null; }

  const serviceCode  = appointment.service_code;
  const detailFields = getFieldsForService(serviceCode);

  async function handleReleaseForm() {
    setReleasingForm(true); setReleaseError(null);
    try {
      const res  = await fetch(`${API}/appointments.php?id=${appointment.id}&action=release_form`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFormReleased(true);
      onRefresh();
    } catch (e) {
      setReleaseError(e.message);
    } finally {
      setReleasingForm(false);
    }
  }

  function handleDeliveryBooked({ uid, startTime }) {
    fetch(`${API}/confirm-appointment.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        uid, startTime, service: appointment.service, serviceCode: appointment.service_code,
        call_type: 'delivery', project_id: appointment.id,
      }),
    }).catch(() => {
      // El webhook de Cal.com es el respaldo si esto falla
    }).finally(() => {
      setShowDeliveryScheduler(false);
      onRefresh();
    });
  }

  async function handleEnablePayment() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setEnableError('Monto inválido'); return; }
    setEnabling(true); setEnableError(null);
    try {
      const res  = await fetch(`${API}/appointments.php?id=${appointment.id}&action=enable_payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEnabled(true);
      onRefresh();
    } catch (e) {
      setEnableError(e.message);
    } finally {
      setEnabling(false);
    }
  }

  async function handleComplete() {
    setCompleting(true); setCompleteError(null);
    try {
      const res  = await fetch(`${API}/appointments.php?id=${appointment.id}&action=complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onRefresh();
    } catch (e) {
      setCompleteError(e.message);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ height: 3, background: isCompleted ? '#63C44D' : isPaid ? '#63C44D' : accent }} />

      {/* ── Encabezado colapsable ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: isMobile ? '16px 20px' : '18px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--display)', fontSize: 17, letterSpacing: '-0.02em',
              margin: '0 0 2px', color: 'var(--type)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {appointment.user_name}
            </p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: 0 }}>
              {appointment.service || '—'} · {scheduledDate}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
            color: statusInfo.color, border: `1px solid ${statusInfo.color}`,
            borderRadius: 'var(--radius-pill)',
            padding: '3px 8px',
          }}>
            {statusInfo.label}
          </span>
          <span style={{
            color: 'var(--type-muted)', fontSize: 12,
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>
            ▾
          </span>
        </div>
      </button>

      {/* ── Contenido expandido ── */}
      {open && (
        <div style={{ padding: isMobile ? '0 20px 20px' : '0 28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <DetailLine label="Email" value={appointment.user_email} />
            <DetailLine label="Fecha" value={scheduledDate} />
          </div>

          {/* Llamadas del proyecto (revisión de diseño / entrega) */}
          {calls.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ ...detailLabelStyle, marginBottom: 12 }}>Llamadas</p>
              <CallsTimeline calls={calls} />
            </div>
          )}

          {/* Formulario de proyecto */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <p style={{ ...detailLabelStyle, marginBottom: 12 }}>Formulario de proyecto</p>
            {parsedDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detailFields.map(field => {
                  const val = parsedDetails[field.key];
                  const isEmpty = Array.isArray(val) ? val.length === 0 : !val;
                  if (isEmpty) return null;
                  const optLabels = OPTION_LABELS[field.key];
                  return (
                    <div key={field.key} style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', lineHeight: 1.5 }}>
                      <span style={detailLabelStyle}>{field.label.replace(' (opcional)', '')}: </span>
                      {field.type === 'link-list' ? (
                        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, verticalAlign: 'top' }}>
                          {(Array.isArray(val) ? val : [val]).map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                               style={{ color: 'var(--type-soft)', fontSize: 13, wordBreak: 'break-all' }}>
                              {url}
                            </a>
                          ))}
                        </span>
                      ) : (
                        optLabels ? (optLabels[val] || val) : val
                      )}
                    </div>
                  );
                })}
              </div>
            ) : appointment.project_details ? (
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {appointment.project_details}
              </p>
            ) : formReleased ? (
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0 }}>
                Formulario liberado — esperando respuesta del cliente.
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleReleaseForm}
                  disabled={releasingForm}
                  style={{
                    padding: '11px 22px',
                    background: accent, color: 'var(--bg)',
                    border: 0, borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                    cursor: releasingForm ? 'not-allowed' : 'pointer',
                    opacity: releasingForm ? 0.6 : 1,
                  }}
                >
                  {releasingForm ? 'Liberando…' : 'Liberar formulario'}
                </button>
                {releaseError && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0 }}>{releaseError}</p>}
              </div>
            )}
          </div>

          {/* Encuesta del cliente (si ya la respondió) */}
          {appointment.feedback && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ ...detailLabelStyle, marginBottom: 12 }}>Encuesta del cliente</p>
              <AdminFeedbackView feedback={appointment.feedback} />
            </div>
          )}

          {/* Pago */}
          {isPaid ? (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#63C44D', margin: 0 }}>
                Pagado — {Number(appointment.amount || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          ) : !enabled ? (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ ...detailLabelStyle, display: 'block', marginBottom: 6 }}>Monto (MXN)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="1"
                  step="1"
                  style={{
                    padding: '10px 12px', width: 160, boxSizing: 'border-box',
                    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
                    fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)', outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleEnablePayment}
                disabled={enabling}
                style={{
                  padding: '11px 22px',
                  background: accent, color: 'var(--bg)',
                  border: 0, borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                  cursor: enabling ? 'not-allowed' : 'pointer',
                  opacity: enabling ? 0.6 : 1,
                }}
              >
                {enabling ? 'Habilitando…' : 'Habilitar pago'}
              </button>
              {enableError && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0, width: '100%' }}>{enableError}</p>}
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#63C44D', margin: 0 }}>
                Pago habilitado — {Number(appointment.amount || parseFloat(amount) || 0).toLocaleString('es-MX', {
                  style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0,
                })}
              </p>
            </div>
          )}

          {/* Agendar entrega — solo una vez pagado */}
          {isPaid && !isCompleted && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ ...detailLabelStyle, marginBottom: 12 }}>Entrega</p>
              {deliveryCall ? (
                <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0 }}>
                  Entrega agendada — {deliveryCall.scheduled_at
                    ? new Date(deliveryCall.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' })
                    : 'sin fecha'}
                </p>
              ) : showDeliveryScheduler ? (
                <CallScheduler
                  namespace="delivery"
                  calLink={CAL_LINK}
                  metadata={{
                    callType: 'delivery', projectId: appointment.id, userId: appointment.user_id,
                    serviceCode: appointment.service_code, service: appointment.service,
                  }}
                  attendee={{ name: appointment.user_name, email: appointment.user_email }}
                  theme={theme}
                  onBookingSuccess={handleDeliveryBooked}
                  style={{ minHeight: 500 }}
                />
              ) : (
                <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
                  Una vez confirmado el día y la hora por WhatsApp con el cliente, agenda aquí la llamada de entrega.
                </p>
              )}
              {!deliveryCall && !showDeliveryScheduler && (
                <button
                  onClick={() => setShowDeliveryScheduler(true)}
                  style={{
                    padding: '11px 22px',
                    background: 'transparent', color: 'var(--type)',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Agendar entrega
                </button>
              )}
            </div>
          )}

          {/* Marcar como completado */}
          {isPaid && !isCompleted && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  padding: '11px 22px',
                  background: 'transparent',
                  color: '#63C44D',
                  border: '1px solid #63C44D',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                  cursor: completing ? 'not-allowed' : 'pointer',
                  opacity: completing ? 0.6 : 1,
                }}
              >
                {completing ? 'Guardando…' : 'Marcar proyecto como completado →'}
              </button>
              {completeError && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: '8px 0 0' }}>{completeError}</p>}
            </div>
          )}

          {isCompleted && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#63C44D', margin: 0 }}>
                ★ Proyecto completado
                {appointment.feedback ? ' · Encuesta recibida' : ' · Encuesta pendiente'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminFeedbackView({ feedback }) {
  let data = null;
  try { data = JSON.parse(feedback); } catch { /* data ya es null */ }
  if (!data) return <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0 }}>{feedback}</p>;

  const recommendLabels = { yes: 'Sí, sin duda', maybe: 'Tal vez', no: 'No por ahora' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.satisfaction && (
        <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)' }}>
          <span style={detailLabelStyle}>Satisfacción: </span>
          <RatingDots value={Number(data.satisfaction)} />
        </p>
      )}
      {data.communication && (
        <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)' }}>
          <span style={detailLabelStyle}>Comunicación: </span>
          <RatingDots value={Number(data.communication)} />
        </p>
      )}
      {data.recommend && (
        <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)' }}>
          <span style={detailLabelStyle}>¿Nos recomendaría?: </span>
          {recommendLabels[data.recommend] || data.recommend}
        </p>
      )}
      {data.highlight && (
        <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', lineHeight: 1.5 }}>
          <span style={detailLabelStyle}>Lo mejor: </span>
          {data.highlight}
        </p>
      )}
      {data.improve && (
        <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', lineHeight: 1.5 }}>
          <span style={detailLabelStyle}>A mejorar: </span>
          {data.improve}
        </p>
      )}
    </div>
  );
}

function RatingDots({ value }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, verticalAlign: 'middle', marginLeft: 6 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: n <= value ? '#63C44D' : 'var(--line)',
          }}
        />
      ))}
      <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginLeft: 4 }}>
        {value}/5
      </span>
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ isAdmin, onNavigate }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--body)', fontSize: 15, color: 'var(--type-soft)', margin: '0 0 20px' }}>
        {isAdmin ? 'No hay citas registradas aún.' : 'Aún no tienes ninguna cita agendada.'}
      </p>
      {!isAdmin && (
        <button
          onClick={() => onNavigate('/comprar')}
          style={{
            padding: '12px 26px',
            background: 'var(--type)', color: 'var(--bg)',
            border: 0, borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Agendar consulta →
        </button>
      )}
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function InfoRow({ label, children }) {
  return (
    <div style={{
      padding: '18px 22px',
      borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    }}>
      <span style={detailLabelStyle}>{label}</span>
      <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <p style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)' }}>
      <span style={detailLabelStyle}>{label}: </span>{value}
    </p>
  );
}

// ── Estilos compartidos ────────────────────────────────────────────────────

const eyebrowStyle = {
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em',
  textTransform: 'uppercase', color: 'var(--type)', margin: '0 0 14px',
};

const detailLabelStyle = {
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.16em',
  textTransform: 'uppercase', color: 'var(--type-muted)',
};
