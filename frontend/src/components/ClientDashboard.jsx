import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer from './Footer';
import PageMeta from './PageMeta';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';

const STATUS_LABELS = {
  pending:            { label: 'Pendiente',          color: 'var(--type-muted)' },
  confirmed:          { label: 'Confirmada',         color: '#63C44D' },
  cancelled:          { label: 'Cancelada',          color: '#e05050' },
  rescheduled:        { label: 'Reprogramada',       color: '#FFDE59' },
  details_submitted:  { label: 'Listo para reunión', color: '#5170ff' },
  completado:         { label: 'Completado',         color: '#63C44D' },
};

const SERVICE_BASE = { '01': 6500, '02': 10000, '03': 12000 };

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

// ── Campos de detalles por servicio ───────────────────────────────────────

const COMMON_FIELDS = [
  {
    key: 'business_name',
    label: 'Nombre del negocio o marca',
    type: 'text',
    placeholder: 'Ej. Cafetería Luna',
    required: true,
  },
  {
    key: 'business_description',
    label: '¿A qué se dedica tu negocio?',
    type: 'textarea',
    placeholder: 'Ej. Vendemos café de especialidad y pasteles artesanales en Veracruz.',
    required: true,
  },
  {
    key: 'has_domain',
    label: '¿Ya tienes dominio y hosting?',
    type: 'radio',
    options: [
      { value: 'yes',     label: 'Sí, ya tengo' },
      { value: 'no',      label: 'No, necesito uno' },
      { value: 'unknown', label: 'No sé qué es eso' },
    ],
    required: true,
  },
];

const SERVICE_FIELDS = {
  '01': [
    {
      key: 'goal',
      label: '¿Cuál es el objetivo principal de la página?',
      type: 'radio',
      options: [
        { value: 'leads',     label: 'Captar clientes / leads' },
        { value: 'info',      label: 'Informar sobre mis servicios' },
        { value: 'portfolio', label: 'Mostrar mi portafolio' },
        { value: 'other',     label: 'Otro' },
      ],
      required: true,
    },
    {
      key: 'reference_url',
      label: '¿Hay algún sitio web que te guste como referencia? (opcional)',
      type: 'text',
      placeholder: 'https://ejemplo.com',
      required: false,
    },
  ],
  '02': [
    {
      key: 'page_count',
      label: '¿Cuántas páginas o secciones necesitas aproximadamente?',
      type: 'radio',
      options: [
        { value: '1-5',  label: '1 – 5 páginas' },
        { value: '6-10', label: '6 – 10 páginas' },
        { value: '10+',  label: 'Más de 10' },
      ],
      required: true,
    },
    {
      key: 'needs_blog',
      label: '¿Necesitas blog o sección de noticias?',
      type: 'radio',
      options: [
        { value: 'yes', label: 'Sí' },
        { value: 'no',  label: 'No' },
      ],
      required: true,
    },
    {
      key: 'reference_url',
      label: '¿Referencia de diseño? (opcional)',
      type: 'text',
      placeholder: 'https://ejemplo.com',
      required: false,
    },
  ],
  '03': [
    {
      key: 'product_type',
      label: '¿Qué tipo de productos vas a vender?',
      type: 'text',
      placeholder: 'Ej. Ropa femenina, suplementos, artesanías…',
      required: true,
    },
    {
      key: 'product_count',
      label: '¿Cuántos productos tienes aproximadamente?',
      type: 'radio',
      options: [
        { value: '1-50',  label: 'Menos de 50' },
        { value: '51-200', label: '50 – 200' },
        { value: '200+',  label: 'Más de 200' },
      ],
      required: true,
    },
    {
      key: 'has_payment',
      label: '¿Ya tienes pasarela de pago (Stripe, PayPal, etc.)?',
      type: 'radio',
      options: [
        { value: 'yes',     label: 'Sí' },
        { value: 'no',      label: 'No' },
        { value: 'unknown', label: 'No lo sé' },
      ],
      required: true,
    },
  ],
};

const OPTION_LABELS = {
  has_domain:    { yes: 'Sí', no: 'No', unknown: 'No sabe' },
  goal:          { leads: 'Captar leads', info: 'Informar servicios', portfolio: 'Portafolio', other: 'Otro' },
  page_count:    { '1-5': '1–5 páginas', '6-10': '6–10 páginas', '10+': 'Más de 10' },
  needs_blog:    { yes: 'Sí', no: 'No' },
  product_count: { '1-50': 'Menos de 50', '51-200': '50–200', '200+': 'Más de 200' },
  has_payment:   { yes: 'Sí', no: 'No', unknown: 'No lo sé' },
};

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
  user, copy, motionSpeed = 1, onBack, onNavItemClick, onContact,
  onServiceClick, onAuthClick, onLogout, theme, onThemeToggle, onNavigate,
}) {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isMobile } = useBreakpoint();
  const token        = localStorage.getItem('token');
  const pollRef      = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

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

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <PageMeta
        title="Panel | Kodeo"
        description="Administra tus citas y proyectos con Kodeo."
        path="/panel"
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

      <main style={{ padding: isMobile ? '50px 20px 80px' : '80px 36px 120px', maxWidth: 860, margin: '0 auto' }}>
        <p style={eyebrowStyle}>{isAdmin ? 'Admin · Todas las citas' : 'Mi panel'}</p>
        <h1 style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(34px, 9vw, 52px)' : 'clamp(40px, 5vw, 64px)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          margin: '0 0 48px',
          paddingBottom: '0.08em',
        }}>
          {isAdmin ? 'Citas' : 'Tu consulta'}
        </h1>

        {loading && <p style={{ color: 'var(--type-muted)', fontFamily: 'var(--body)', fontSize: 14 }}>Cargando…</p>}
        {error   && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 14 }}>{error}</p>}

        {!loading && !error && appointments.length === 0 && (
          <EmptyState isAdmin={isAdmin} onNavigate={navigate} />
        )}

        {!loading && !error && appointments.length > 0 && (
          isAdmin
            ? <AdminView appointments={appointments} token={token} onRefresh={fetchAppointments} isMobile={isMobile} />
            : <ClientView
                appointments={appointments}
                token={token}
                onDetailsSaved={(id) => setAppointments(prev =>
                  prev.map(a => a.id === id ? { ...a, status: 'details_submitted' } : a)
                )}
                navigate={navigate}
                isMobile={isMobile}
              />
        )}
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}

// ── Vista Cliente ──────────────────────────────────────────────────────────

function ClientView({ appointments, token, onDetailsSaved, navigate, isMobile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {appointments.map((appointment, index) => (
        <AppointmentClientCard
          key={appointment.id}
          appointment={appointment}
          index={index}
          total={appointments.length}
          token={token}
          onDetailsSaved={() => onDetailsSaved(appointment.id)}
          navigate={navigate}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

function AppointmentClientCard({ appointment, index, total, token, onDetailsSaved, navigate, isMobile }) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  const accent        = ACCENT[appointment.service_code] || ACCENT['01'];
  const statusInfo    = STATUS_LABELS[appointment.status] || { label: appointment.status, color: 'var(--type-muted)' };
  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    : null;

  const alreadySubmitted = appointment.status === 'details_submitted'
    || appointment.status === 'completado'
    || !!appointment.project_details;
  const isPaid       = !!appointment.stripe_payment_intent_id;
  const isCompleted  = appointment.status === 'completado';
  const hasFeedback  = !!appointment.feedback;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {total > 1 && (
        <p style={{ ...eyebrowStyle, margin: 0 }}>Cita {index + 1} de {total}</p>
      )}

      {/* ── Datos de la cita ── */}
      <div style={{ border: '1px solid var(--line)' }}>
        <div style={{ height: 3, background: isPaid ? '#63C44D' : accent }} />
        <InfoRow label="Servicio">{appointment.service || '—'}</InfoRow>
        <InfoRow label="Estado">
          {isPaid
            ? <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
            : <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
          }
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
          border: '1px solid #63C44D', padding: '20px 24px',
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
          border: `1px solid ${accent}`, padding: '20px 24px',
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

      {/* ── Detalles del proyecto ── */}
      <div>
        <p style={eyebrowStyle}>Detalles del proyecto</p>
        <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
          {alreadySubmitted
            ? 'Ya enviaste tus detalles. Nuestro equipo los revisará antes de la reunión.'
            : 'Esta información nos ayuda a preparar una propuesta personalizada antes de tu llamada.'}
        </p>
        {alreadySubmitted
          ? <SubmittedDetails project_details={appointment.project_details} serviceCode={appointment.service_code} />
          : <ProjectForm
              serviceCode={appointment.service_code}
              appointmentId={appointment.id}
              token={token}
              onDetailsSaved={onDetailsSaved}
              isMobile={isMobile}
            />
        }
      </div>

      {/* ── Encuesta de satisfacción (solo cuando está completado) ── */}
      {isCompleted && (
        <div>
          <p style={eyebrowStyle}>Tu opinión</p>
          {hasFeedback || feedbackSent ? (
            <div style={{
              border: '1px solid #63C44D', padding: '28px 24px',
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

// ── Formulario de detalles del proyecto ───────────────────────────────────

function ProjectForm({ serviceCode, appointmentId, token, onDetailsSaved, isMobile }) {
  const fields = [...COMMON_FIELDS, ...(SERVICE_FIELDS[serviceCode] || SERVICE_FIELDS['01'])];

  const initial = Object.fromEntries(fields.map(f => [f.key, '']));
  const [form, setForm]           = useState(initial);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState(null);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const isComplete = fields
    .filter(f => f.required)
    .every(f => form[f.key]?.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isComplete) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`${API}/appointments.php?id=${appointmentId}&action=details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_details: JSON.stringify(form) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      onDetailsSaved();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {fields.map(field => (
        <FormField
          key={field.key}
          field={field}
          value={form[field.key]}
          onChange={v => set(field.key, v)}
          isMobile={isMobile}
        />
      ))}

      {saveError && (
        <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0 }}>{saveError}</p>
      )}

      <button
        type="submit"
        disabled={saving || !isComplete}
        style={{
          alignSelf: 'flex-start',
          padding: '13px 28px',
          background: isComplete ? 'var(--type)' : 'var(--bg-3)',
          color: isComplete ? 'var(--bg)' : 'var(--type-muted)',
          border: isComplete ? 0 : '1px solid var(--line)',
          borderRadius: 'var(--radius-pill)',
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
          cursor: (saving || !isComplete) ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {saving ? 'Enviando…' : saved ? 'Enviado ✓' : 'Enviar detalles →'}
      </button>
    </form>
  );
}

function FormField({ field, value, onChange }) {
  const labelEl = (
    <label style={{
      fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em',
      textTransform: 'uppercase', color: 'var(--type-soft)',
      display: 'block', marginBottom: field.type === 'radio' ? 12 : 8,
    }}>
      {field.label}
      {field.required && <span style={{ color: '#e05050', marginLeft: 4 }}>*</span>}
    </label>
  );

  if (field.type === 'text') {
    return (
      <div>
        {labelEl}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {labelEl}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        {labelEl}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {field.options.map(opt => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
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
}

// ── Detalles ya enviados ───────────────────────────────────────────────────

function SubmittedDetails({ project_details, serviceCode }) {
  let parsed = null;
  try { parsed = project_details ? JSON.parse(project_details) : null; } catch { parsed = null; }

  if (!parsed) {
    return (
      <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {project_details}
      </p>
    );
  }

  const fields = [...COMMON_FIELDS, ...(SERVICE_FIELDS[serviceCode] || SERVICE_FIELDS['01'])];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--line)' }}>
      {fields.map((field, i) => {
        const val = parsed[field.key];
        if (!val) return null;
        const optLabels = OPTION_LABELS[field.key];
        const display = optLabels ? (optLabels[val] || val) : val;
        return (
          <div
            key={field.key}
            style={{
              padding: '14px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
            }}
          >
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#d0d0d0', flexShrink: 0, paddingTop: 2 }}>
              {field.label.replace(' (opcional)', '')}
            </span>
            <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', textAlign: 'right', lineHeight: 1.5 }}>
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Vista Admin ────────────────────────────────────────────────────────────

function AdminView({ appointments, token, onRefresh, isMobile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {appointments.map(apt => (
        <AppointmentAdminCard
          key={apt.id}
          appointment={apt}
          token={token}
          onRefresh={onRefresh}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

function AppointmentAdminCard({ appointment, token, onRefresh, isMobile }) {
  const [open, setOpen]               = useState(false);
  const [amount, setAmount]           = useState(
    appointment.amount ? String(parseFloat(appointment.amount)) : String(SERVICE_BASE[appointment.service_code] || '')
  );
  const [enabling, setEnabling]       = useState(false);
  const [enabled, setEnabled]         = useState(Number(appointment.payment_enabled) === 1);
  const [enableError, setEnableError] = useState(null);
  const [completing, setCompleting]   = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const accent      = ACCENT[appointment.service_code] || ACCENT['01'];
  const isPaid      = !!appointment.stripe_payment_intent_id;
  const isCompleted = appointment.status === 'completado';

  const statusInfo = isCompleted
    ? { label: 'Completado', color: '#63C44D' }
    : isPaid
      ? { label: 'Pagado', color: '#63C44D' }
      : STATUS_LABELS[appointment.status] || { label: appointment.status, color: 'var(--type-muted)' };

  const scheduledDate = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    : 'Sin fecha';

  let parsedDetails = null;
  try { parsedDetails = appointment.project_details ? JSON.parse(appointment.project_details) : null; } catch { parsedDetails = null; }

  const serviceCode  = appointment.service_code;
  const detailFields = [...COMMON_FIELDS, ...(SERVICE_FIELDS[serviceCode] || SERVICE_FIELDS['01'])];

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
    <div style={{ border: '1px solid var(--line)' }}>
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

          {/* Detalles del proyecto */}
          {parsedDetails && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ ...detailLabelStyle, marginBottom: 12 }}>Detalles del proyecto</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detailFields.map(field => {
                  const val = parsedDetails[field.key];
                  if (!val) return null;
                  const optLabels = OPTION_LABELS[field.key];
                  const display = optLabels ? (optLabels[val] || val) : val;
                  return (
                    <p key={field.key} style={{ margin: 0, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', lineHeight: 1.5 }}>
                      <span style={detailLabelStyle}>{field.label.replace(' (opcional)', '')}: </span>
                      {display}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
          {appointment.project_details && !parsedDetails && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <p style={{ ...detailLabelStyle, marginBottom: 8 }}>Detalles del proyecto</p>
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {appointment.project_details}
              </p>
            </div>
          )}

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
                    background: 'var(--bg)', border: '1px solid var(--line)',
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
  try { data = JSON.parse(feedback); } catch { data = null; }
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
    <div style={{ border: '1px solid var(--line)', padding: '40px 28px', textAlign: 'center' }}>
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
  textTransform: 'uppercase', color: '#d0d0d0',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-2)',
  border: '1px solid var(--line)',
  fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
