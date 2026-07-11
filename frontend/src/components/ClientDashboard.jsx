import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import PageMeta from './PageMeta';
import RefreshButton from './RefreshButton';
import BookingCalendar from './BookingCalendar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';
import { inputStyle } from '../data/projectFormFields';

// WhatsApp de Kodeo al que llega la solicitud de cita (mismo número que /agendar)
const WA_PHONE = '522298483706';

const STATUS_LABELS = {
  pending:        { label: 'Pendiente',    color: 'var(--type-muted)' },
  confirmed:      { label: 'Confirmada',   color: '#63C44D' },
  cancelled:      { label: 'Cancelada',    color: '#e05050' },
  rescheduled:    { label: 'Reprogramada', color: '#FFDE59' },
  form_submitted: { label: 'Confirmada',   color: '#63C44D' },
  completado:     { label: 'Completada',   color: '#63C44D' },
};

const CALL_TYPE_LABELS = {
  intro:         'Consulta inicial',
  design_review: 'Revisión de diseño',
  delivery:      'Entrega',
};

const CALL_TYPE_COLORS = {
  intro:         'var(--accent-green)',
  design_review: 'var(--accent-yellow)',
  delivery:      '#63C44D',
  panel:         'var(--accent-blue)',
};

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
};

const MX_TZ = 'America/Mexico_City';

// Clave YYYY-MM-DD de una cita en horario del centro de México
function citaDayKey(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: MX_TZ });
}

function citaTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MX_TZ,
  });
}

// Etiqueta del asunto de la cita: para citas de panel, el tipo elegido;
// para las llamadas del flujo Cal.com, el tipo de llamada
function citaTipoLabel(cita) {
  if (cita.call_type === 'panel') {
    return cita.service_code === 'existente' ? 'Proyecto existente' : 'Proyecto nuevo';
  }
  return CALL_TYPE_LABELS[cita.call_type] || 'Cita';
}

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
  const [view, setView]                 = useState('calendar'); // 'calendar' | 'book'

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
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Solo información de citas: con fecha, futuras y no canceladas.
  // Las citas pasadas no se muestran (las de panel además se borran en backend).
  const upcoming = appointments
    .filter(a => a.scheduled_at && new Date(a.scheduled_at) > new Date() && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAppointments(true);
    setRefreshing(false);
  }

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <PageMeta
        title="Citas | Kodeo"
        description="Consulta el calendario de tus citas con Kodeo."
        path="/citas"
      />

      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px' }}>
        {view === 'calendar' && (
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
                {!isAdmin && (
                  <button
                    onClick={() => setView('book')}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--type)', color: 'var(--bg)',
                      border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                      fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Agendar cita
                  </button>
                )}
                <RefreshButton onClick={handleRefresh} loading={refreshing} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {isAdmin
                ? `Calendario de citas agendadas por tus clientes${upcoming.length ? ` — ${upcoming.length} próxima${upcoming.length !== 1 ? 's' : ''}` : ''}.`
                : 'Tu calendario de citas con Kodeo. Las citas pasadas se retiran automáticamente.'}
            </p>
          </div>
        )}

        {view === 'book' && !isAdmin ? (
          <PanelBooking
            user={user}
            copy={copy}
            isMobile={isMobile}
            token={token}
            onBack={() => setView('calendar')}
            onRefresh={() => fetchAppointments(true)}
          />
        ) : (
          <>
            {loading && <p style={{ color: 'var(--type-muted)', fontFamily: 'var(--body)', fontSize: 14 }}>Cargando…</p>}
            {error   && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 14 }}>{error}</p>}

            {!loading && !error && upcoming.length === 0 && (
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '40px 28px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--body)', fontSize: 15, color: 'var(--type-soft)', margin: 0 }}>
                  {isAdmin ? 'No hay citas generadas.' : 'No tienes citas generadas.'}
                </p>
              </div>
            )}

            {!loading && !error && upcoming.length > 0 && (
              <CitasCalendar
                citas={upcoming}
                isAdmin={isAdmin}
                token={token}
                onRefresh={() => fetchAppointments(true)}
                isMobile={isMobile}
              />
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}

// ── Calendario mensual de citas (estilo Google Calendar) ───────────────────

function CitasCalendar({ citas, isAdmin, token, onRefresh, isMobile }) {
  const today = new Date();

  // Citas agrupadas por día (horario del centro de México)
  const byDay = useMemo(() => {
    const map = {};
    for (const cita of citas) {
      const key = citaDayKey(cita.scheduled_at);
      (map[key] = map[key] || []).push(cita);
    }
    return map;
  }, [citas]);

  const firstCitaDate = new Date(citas[0].scheduled_at);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(firstCitaDate.getFullYear(), firstCitaDate.getMonth(), 1)
  );
  const [selectedKey, setSelectedKey] = useState(() => citaDayKey(citas[0].scheduled_at));

  const monthFmt = useMemo(() => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }), []);
  const dayFmt   = useMemo(() => new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }), []);

  // Encabezados lun→dom (la cuadrícula arranca en lunes)
  const weekdayLabels = useMemo(() => {
    const base = new Date(2026, 5, 1); // 1 jun 2026 = lunes
    const fmt  = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return fmt.format(d).replace('.', '');
    });
  }, []);

  // Celdas del mes visible (null = hueco antes del día 1)
  const cells = useMemo(() => {
    const first       = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const leading     = (first.getDay() + 6) % 7; // lunes = 0
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
      ),
    ];
  }, [viewMonth]);

  const pad     = n => String(n).padStart(2, '0');
  const cellKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = cellKey(today);

  const changeMonth = (delta) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));

  const selectedCitas = selectedKey ? (byDay[selectedKey] || []) : [];
  const selectedDate  = selectedKey ? new Date(`${selectedKey}T12:00:00`) : null;

  const navBtn = {
    width: 34, height: 34, borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)', background: 'transparent',
    color: 'var(--type)', cursor: 'pointer',
    fontFamily: 'var(--ui)', fontSize: 14, lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Cuadrícula del mes ── */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px 16px 0' : '22px 24px 0' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 20 : 24, letterSpacing: '-0.02em', textTransform: 'capitalize', color: 'var(--type)' }}>
            {monthFmt.format(viewMonth)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button aria-label="Mes anterior" onClick={() => changeMonth(-1)} style={navBtn}>←</button>
            <button aria-label="Mes siguiente" onClick={() => changeMonth(1)} style={navBtn}>→</button>
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 10px 14px' : '16px 18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {weekdayLabels.map(w => (
              <div key={w} style={{
                textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 10,
                letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)',
                padding: '6px 0',
              }}>
                {w}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((date, i) => {
              if (!date) return <div key={`gap-${i}`} />;
              const key       = cellKey(date);
              const dayCitas  = byDay[key] || [];
              const hasCitas  = dayCitas.length > 0;
              const isSelected = key === selectedKey;
              const isToday    = key === todayKey;

              return (
                <button
                  key={key}
                  onClick={() => hasCitas && setSelectedKey(key)}
                  style={{
                    minHeight: isMobile ? 52 : 92,
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--line)',
                    background: isSelected ? 'var(--bg-3)' : hasCitas ? 'var(--bg-2)' : 'transparent',
                    cursor: hasCitas ? 'pointer' : 'default',
                    padding: isMobile ? '6px 4px' : '8px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4,
                    textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (hasCitas && !isSelected) e.currentTarget.style.borderColor = 'var(--line-2)'; }}
                  onMouseLeave={e => { if (hasCitas && !isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}
                >
                  <span style={{
                    fontFamily: 'var(--ui)', fontSize: 12, lineHeight: 1,
                    color: isToday ? 'var(--bg)' : hasCitas ? 'var(--type)' : 'var(--type-muted)',
                    background: isToday ? 'var(--type)' : 'transparent',
                    borderRadius: '50%',
                    width: 22, height: 22,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: isMobile ? 'center' : 'flex-start',
                    flexShrink: 0,
                  }}>
                    {date.getDate()}
                  </span>

                  {/* Eventos: chips con hora en desktop, puntos en mobile */}
                  {isMobile ? (
                    hasCitas && (
                      <span style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                        {dayCitas.slice(0, 3).map(c => (
                          <span key={c.id} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: CALL_TYPE_COLORS[c.call_type] || 'var(--accent-blue)',
                          }} />
                        ))}
                      </span>
                    )
                  ) : (
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                      {dayCitas.slice(0, 2).map(c => (
                        <span key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontFamily: 'var(--body)', fontSize: 11, lineHeight: 1.2,
                          color: 'var(--type-soft)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: CALL_TYPE_COLORS[c.call_type] || 'var(--accent-blue)',
                          }} />
                          {citaTime(c.scheduled_at)}
                        </span>
                      ))}
                      {dayCitas.length > 2 && (
                        <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-muted)' }}>
                          +{dayCitas.length - 2} más
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detalle del día seleccionado ── */}
      {selectedDate && (
        <div>
          <p style={{
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase',
            color: 'var(--type-muted)', margin: '0 0 12px',
          }}>
            {selectedCitas.length > 0
              ? `Citas del ${dayFmt.format(selectedDate)}`
              : dayFmt.format(selectedDate)}
          </p>
          {selectedCitas.length === 0 ? (
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0 }}>
              Sin citas este día.
            </p>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {selectedCitas.map((cita, i) => (
                <CitaRow key={cita.id} cita={cita} first={i === 0} isAdmin={isAdmin} token={token} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fila de cita (solo información; el admin puede reprogramar las de panel) ─

function CitaRow({ cita, first, isAdmin, token, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [when, setWhen]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const info  = STATUS_LABELS[cita.status] || { label: cita.status, color: 'var(--type-muted)' };
  const color = CALL_TYPE_COLORS[cita.call_type] || 'var(--accent-blue)';
  // project_details solo es texto legible en citas de panel (en el flujo
  // Cal.com guarda el JSON del formulario de proyecto — no se muestra aquí)
  const motivo = cita.call_type === 'panel' ? cita.project_details : null;

  const startEdit = () => {
    if (cita.scheduled_at) {
      const d   = new Date(cita.scheduled_at);
      const pad = n => String(n).padStart(2, '0');
      setWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
    setEditing(true);
    setError(null);
  };

  const save = async () => {
    if (!when) return;
    setSaving(true); setError(null);
    try {
      const res  = await fetch(`${API}/appointments.php?id=${cita.id}&action=reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduled_at: new Date(when).toISOString() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditing(false);
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '16px 20px', borderTop: first ? 'none' : '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '-0.02em',
          color: 'var(--type)', flexShrink: 0, minWidth: 82,
        }}>
          {citaTime(cita.scheduled_at)}
        </span>

        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', margin: '0 0 2px' }}>
            {cita.service || 'Cita'}
            <span style={{ marginLeft: 10, fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
              {citaTipoLabel(cita)}
            </span>
          </p>
          {isAdmin && cita.user_name && (
            <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: 0 }}>
              {cita.user_name} ({cita.user_email})
            </p>
          )}
          {motivo && (
            <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', margin: '4px 0 0', lineHeight: 1.5 }}>
              Motivo: {motivo}
            </p>
          )}
        </div>

        <span style={{
          fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
          color: info.color, border: `1px solid ${info.color}`,
          borderRadius: 'var(--radius-pill)', padding: '3px 8px', flexShrink: 0,
        }}>
          {info.label}
        </span>

        {isAdmin && cita.call_type === 'panel' && !editing && (
          <button
            onClick={startEdit}
            style={{
              padding: '7px 14px', background: 'transparent', color: 'var(--type-soft)',
              border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Cambiar horario
          </button>
        )}
      </div>

      {isAdmin && editing && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="datetime-local"
            value={when}
            onChange={e => setWhen(e.target.value)}
            style={{
              padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 13,
              color: 'var(--type)', outline: 'none', colorScheme: 'inherit',
            }}
          />
          <button
            onClick={save}
            disabled={saving || !when}
            style={{
              padding: '9px 18px', background: 'var(--type)', color: 'var(--bg)',
              border: 0, borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
              cursor: saving || !when ? 'not-allowed' : 'pointer', opacity: saving || !when ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: '9px 18px', background: 'transparent', color: 'var(--type-muted)',
              border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && <p style={{ color: '#e05050', fontFamily: 'var(--body)', fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}

// ── Agendar cita desde el panel (clientes existentes) ──────────────────────
// Mismo calendario propio que /agendar (BookingCalendar); la confirmación se
// envía por WhatsApp con nombre, tipo, proyecto, correo y motivo de la cita,
// y la cita se registra en el backend para aparecer en el calendario.

function PanelBooking({ user, copy, isMobile, token, onBack, onRefresh }) {
  const bk     = copy.booking;
  const locale = navigator.language || 'es-MX';

  const [projects, setProjects]           = useState(null);
  const [mode, setMode]                   = useState(null); // 'new' | 'existing'
  const [projectChoice, setProjectChoice] = useState('');
  const [serviceChoice, setServiceChoice] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [reason, setReason]               = useState('');
  const [slot, setSlot]                   = useState(null);
  const [sent, setSent]                   = useState(false);

  // Proyectos del cliente — para seleccionar uno cuando la cita es de un proyecto existente
  useEffect(() => {
    fetch(`${API}/projects.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]));
  }, [token]);

  const TYPE_LABELS = { new: 'Proyecto nuevo', existing: 'Proyecto existente' };

  const hasProjects = (projects?.length ?? 0) > 0;
  const projectName = mode === 'existing'
    ? projectChoice
    : serviceChoice === '__otro__' ? customProject.trim() : serviceChoice;
  const canConfirm  = !!mode && !!projectName && !!reason.trim() && !!slot;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setProjectChoice('');
    setServiceChoice('');
    setCustomProject('');
  };

  const buildWaLink = () => {
    const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    const msg = bk.panelWaMessage
      .replace('{name}', user?.name || '')
      .replace('{type}', TYPE_LABELS[mode] || '')
      .replace('{project}', projectName)
      .replace('{email}', user?.email || '')
      .replace('{reason}', reason.trim())
      .replace('{date}', dateFmt.format(slot))
      .replace('{time}', timeFmt.format(slot));
    return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
  };

  const handleConfirm = () => {
    window.open(buildWaLink(), '_blank', 'noopener');
    // Registra la cita en el backend para que aparezca en la sección de citas
    // (si falla, la solicitud igual llegó por WhatsApp)
    fetch(`${API}/appointments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        service: projectName,
        reason: reason.trim(),
        tipo: mode === 'existing' ? 'existente' : 'nuevo',
        scheduled_at: slot.toISOString(),
      }),
    }).catch(() => {}).finally(() => onRefresh?.());
    setSent(true);
  };

  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });

  const fieldLabel = {
    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em',
    textTransform: 'uppercase', color: 'var(--type-soft)',
    display: 'block', marginBottom: 8,
  };

  if (sent) {
    return (
      <div style={{
        border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
        padding: isMobile ? '40px 24px' : '56px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24,
      }}>
        <div>
          <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#63C44D', margin: '0 0 10px' }}>
            {bk.success.label}
          </p>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: isMobile ? 28 : 36, letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.1 }}>
            {bk.success.title}
          </h2>
          <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0, maxWidth: 460, lineHeight: 1.6 }}>
            {bk.success.body}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={() => window.open(buildWaLink(), '_blank', 'noopener')}
            style={{
              padding: '13px 26px', background: 'var(--type)', color: 'var(--bg)',
              border: 0, borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {bk.success.resend}
          </button>
          <button
            onClick={onBack}
            style={{
              padding: '13px 26px', background: 'transparent', color: 'var(--type)',
              border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Volver a citas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado con regreso */}
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
        <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
          Agendar cita
        </h1>
        <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
          {mode === null
            ? '¿Tu cita es sobre un producto nuevo o sobre uno que ya tienes?'
            : 'Cuéntanos el motivo, elige el horario y confirma por WhatsApp.'}
        </p>
      </div>

      {mode === null ? (
        /* Paso 1: elección en grande — producto nuevo (izquierda) o existente (derecha) */
        <div style={{ padding: isMobile ? '24px 0 40px' : '48px 0 64px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 14 : 22,
            maxWidth: 780, margin: '0 auto',
          }}>
            {[
              {
                id: 'new',
                title: 'Un producto nuevo',
                desc: 'Quiero cotizar o arrancar un proyecto nuevo.',
                disabled: false,
              },
              {
                id: 'existing',
                title: 'Un producto que ya tengo',
                desc: projects === null
                  ? 'Cargando tus proyectos…'
                  : hasProjects
                    ? 'Es sobre uno de mis proyectos actuales.'
                    : 'Aún no tienes proyectos activos.',
                disabled: !hasProjects,
              },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => handleModeChange(opt.id)}
                style={{
                  cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: isMobile ? '36px 24px' : '60px 32px',
                  opacity: opt.disabled ? 0.45 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                  textAlign: 'center',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  if (opt.disabled) return;
                  e.currentTarget.style.background = 'var(--bg-2)';
                  e.currentTarget.style.borderColor = 'var(--line-2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 24 : 30, letterSpacing: '-0.025em', color: 'var(--type)', lineHeight: 1.15 }}>
                  {opt.title}
                </span>
                <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', lineHeight: 1.55, maxWidth: 260 }}>
                  {opt.desc}
                </span>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-soft)', marginTop: 6 }}>
                  Elegir →
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Tipo elegido + opción de cambiar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase',
            color: 'var(--type-soft)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-pill)', padding: '7px 14px',
          }}>
            {TYPE_LABELS[mode]}
          </span>
          <button
            type="button"
            onClick={() => handleModeChange(null)}
            style={{
              background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.16em',
              textTransform: 'uppercase', color: 'var(--type-muted)',
            }}
          >
            ← Cambiar
          </button>
        </div>

        {/* Proyecto / producto + motivo */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: isMobile ? '20px 18px' : '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Producto existente: seleccionarlo de sus proyectos */}
          {mode === 'existing' && (
            <div>
              <label style={fieldLabel}>¿Cuál de tus proyectos?</label>
              <select
                value={projectChoice}
                onChange={e => setProjectChoice(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="">Selecciona un proyecto…</option>
                {(projects ?? []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Producto nuevo: selección con tarjetas (mismo estilo que /comprar) */}
          {mode === 'new' && (
            <div>
              <label style={fieldLabel}>¿Qué producto te interesa?</label>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                {copy.services.list.map(svc => {
                  const accent   = ACCENT[svc.code] || ACCENT['01'];
                  const selected = serviceChoice === svc.name;
                  return (
                    <button
                      key={svc.code}
                      type="button"
                      onClick={() => setServiceChoice(svc.name)}
                      style={{
                        textAlign: 'left', cursor: 'pointer', padding: 0,
                        background: selected ? 'var(--bg-2)' : 'transparent',
                        border: selected ? `1px solid ${accent}` : '1px solid var(--line)',
                        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)'; }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ height: 3, background: accent, width: '100%' }} />
                      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.26em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
                            {svc.code}
                          </span>
                          {selected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '-0.025em', color: 'var(--type)', lineHeight: 1.1 }}>
                          {svc.name}
                        </span>
                        <p style={{ fontFamily: 'var(--body)', fontSize: 12, lineHeight: 1.55, color: 'var(--type-soft)', margin: 0 }}>
                          {svc.lead}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)' }}>
                            {svc.price}
                          </span>
                          <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
                            {svc.time}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Otro */}
                <button
                  type="button"
                  onClick={() => setServiceChoice('__otro__')}
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: 0,
                    background: serviceChoice === '__otro__' ? 'var(--bg-2)' : 'transparent',
                    border: serviceChoice === '__otro__' ? '1px solid var(--type)' : '1px solid var(--line)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { if (serviceChoice !== '__otro__') e.currentTarget.style.background = 'var(--bg-2)'; }}
                  onMouseLeave={e => { if (serviceChoice !== '__otro__') e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ height: 3, background: 'var(--type-soft)', width: '100%' }} />
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', boxSizing: 'border-box', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.26em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
                        04
                      </span>
                      {serviceChoice === '__otro__' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--type)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '-0.025em', color: 'var(--type)', lineHeight: 1.1 }}>
                      Otro
                    </span>
                    <p style={{ fontFamily: 'var(--body)', fontSize: 12, lineHeight: 1.55, color: 'var(--type-soft)', margin: 0 }}>
                      ¿Tienes algo distinto en mente? Cuéntanoslo y lo revisamos contigo en la llamada.
                    </p>
                  </div>
                </button>
              </div>

              {serviceChoice === '__otro__' && (
                <input
                  value={customProject}
                  onChange={e => setCustomProject(e.target.value)}
                  placeholder="Cuéntanos qué tienes en mente…"
                  style={{ ...inputStyle, marginTop: 12 }}
                />
              )}
            </div>
          )}

          <div>
            <label style={fieldLabel}>Motivo de la cita</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Cuéntanos brevemente para qué necesitas la reunión…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* Calendario propio (mismo que /agendar) */}
        <BookingCalendar
          locale={locale}
          accent="var(--accent-blue)"
          copy={bk.calendarStep}
          isMobile={isMobile}
          selectedSlot={slot}
          onSelectSlot={setSlot}
        />

        {/* Resumen + confirmación */}
        {slot && (
          <div style={{
            border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
            padding: isMobile ? '20px 18px' : '22px 28px',
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between', gap: 18,
          }}>
            <div>
              {mode && projectName && (
                <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--accent-blue)', margin: '0 0 6px' }}>
                  {TYPE_LABELS[mode]} · {projectName}
                </p>
              )}
              <p style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 20 : 24, letterSpacing: '-0.02em', margin: 0, textTransform: 'capitalize' }}>
                {dateFmt.format(slot)} · {timeFmt.format(slot)}
              </p>
              <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
                {canConfirm ? bk.calendarStep.confirmHint : 'Indica si es un producto nuevo o existente, elige el proyecto y escribe el motivo para confirmar.'}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                padding: '15px 28px', background: 'var(--type)', color: 'var(--bg)',
                border: 0, borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                opacity: canConfirm ? 1 : 0.5,
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'opacity 0.2s',
              }}
            >
              {bk.calendarStep.confirm}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
