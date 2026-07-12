import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import { API_BASE_URL } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatDate(iso, locale) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso, locale) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 2 });
function money(amount, currency = 'MXN') {
  const n = Number(amount || 0);
  if (currency && currency !== 'MXN') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
  }
  return MXN.format(n);
}

// ── Colores de estatus ──────────────────────────────────────────────────────

const STATUS_COLOR = {
  completado: '#16a34a', pagado: '#16a34a', confirmed: '#16a34a', Completada: '#16a34a',
  cancelado: '#e05050', cancelled: '#e05050',
  en_proceso: '#d08700', en_desarrollo: '#d08700', pending: '#d08700', pendiente: '#d08700', rescheduled: '#d08700',
  en_diseno: '#5170ff', form_submitted: '#5170ff',
};

function StatusBadge({ status, label }) {
  const color = STATUS_COLOR[status] || 'var(--type-muted)';
  return (
    <span style={{
      fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase',
      color, border: `1px solid ${color}44`, background: `${color}12`,
      borderRadius: 'var(--radius-pill)', padding: '3px 9px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Bloques de sección ──────────────────────────────────────────────────────

function Section({ title, count, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '-0.02em', color: 'var(--type)', margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', color: 'var(--type-muted)' }}>
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '22px 20px', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', textAlign: 'center' }}>
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
      {children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UserDetailPage({ user, onNavigate, onLogout, copy, theme, onThemeToggle }) {
  const D = copy.portal.userDetail;
  const STATUS = copy.portal.status;
  const locale = copy.portal.locale;
  const { userId } = useParams();
  const { isMobile } = useBreakpoint();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const token = localStorage.getItem('token');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE_URL}/users.php?id=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.loadError);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, userId, D.loadError]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const u            = data?.user;
  const orders       = data?.orders || [];
  const projects     = data?.projects || [];
  const appointments = data?.appointments || [];

  const isAdmin = u?.role === 'administrador';
  const initial = (u?.name || u?.username || '?')[0].toUpperCase();

  // Total pagado: pedidos completados + órdenes de pago pagadas
  const paidOrders = orders
    .filter(o => o.status === 'completado')
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const paidPO = projects
    .flatMap(p => p.payment_orders || [])
    .filter(po => po.status === 'pagado')
    .reduce((sum, po) => sum + Number(po.amount || 0), 0);
  const totalPaid = paidOrders + paidPO;

  const STATS = [
    { label: D.statsOrders,       value: orders.length },
    { label: D.statsProjects,     value: projects.length },
    { label: D.statsAppointments, value: appointments.length },
    { label: D.statsTotalPaid,    value: money(totalPaid) },
  ];

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px' }}>

        {/* ── Volver ── */}
        <button
          onClick={() => onNavigate('/usuarios')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--type-muted)', fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
            padding: 0, marginBottom: 22,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--type-muted)'}
        >
          <span style={{ fontSize: 14 }}>←</span> {D.back}
        </button>

        {loading && (
          <EmptyRow>{D.loading}</EmptyRow>
        )}

        {!loading && error && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid #dc262630', borderRadius: 'var(--radius-lg)', padding: '22px 20px', fontFamily: 'var(--body)', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && u && (
          <>
            {/* ── Encabezado del usuario ── */}
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: isAdmin ? '#5170ff20' : 'var(--bg-3)',
                  border: `1px solid ${isAdmin ? '#5170ff44' : 'var(--line)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 24, color: isAdmin ? '#5170ff' : 'var(--type-muted)' }}>{initial}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 24 : 30, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                      {u.name || u.username}
                    </h1>
                    <span style={{
                      fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
                      color: isAdmin ? '#5170ff' : 'var(--type-muted)',
                      border: `1px solid ${isAdmin ? '#5170ff44' : 'var(--line)'}`,
                      background: isAdmin ? '#5170ff12' : 'transparent',
                      borderRadius: 'var(--radius-pill)', padding: '3px 9px',
                    }}>
                      {isAdmin ? D.roleAdmin : D.roleClient}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', marginTop: 5, wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {u.email}<span style={{ margin: '0 6px', opacity: .35 }}>·</span>@{u.username}
                  </div>
                </div>
              </div>
              <RefreshButton onClick={fetchDetail} loading={loading} />
            </div>

            {/* ── Meta ── */}
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', marginTop: 18, fontFamily: 'var(--body)', fontSize: 12.5, color: 'var(--type-muted)' }}>
              <span>{D.memberSince} <strong style={{ color: 'var(--type)', fontWeight: 500 }}>{formatDate(u.created_at, locale)}</strong></span>
              <span>{D.accessLabel} <strong style={{ color: 'var(--type)', fontWeight: 500 }}>{u.oauth_provider ? (u.oauth_provider === 'google' ? 'Google' : u.oauth_provider === 'apple' ? 'Apple' : u.oauth_provider) : D.accessPassword}</strong></span>
              {u.verified_at && <span>{D.verifiedOn} <strong style={{ color: 'var(--type)', fontWeight: 500 }}>{formatDate(u.verified_at, locale)}</strong></span>}
            </div>

            {/* ── KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
              {STATS.map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: '-0.03em', color: 'var(--type)', lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* ── Pedidos ── */}
            <Section title={D.ordersTitle} count={orders.length}>
              {orders.length === 0 ? (
                <EmptyRow>{D.ordersEmpty}</EmptyRow>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.map(o => (
                    <Card key={o.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--ui)', fontSize: 13, letterSpacing: '.04em', color: 'var(--type)', textTransform: 'uppercase' }}>{o.service}</div>
                          <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 3 }}>
                            {formatDate(o.created_at, locale)}
                            {o.delivery_date && <><span style={{ margin: '0 5px', opacity: .35 }}>·</span>{D.deliveryLabel} {formatDate(o.delivery_date, locale)}</>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--type)', letterSpacing: '-0.02em' }}>{money(o.amount)}</span>
                          <StatusBadge status={o.status} label={STATUS[o.status] || o.status} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Proyectos ── */}
            <Section title={D.projectsTitle} count={projects.length}>
              {projects.length === 0 ? (
                <EmptyRow>{D.projectsEmpty}</EmptyRow>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {projects.map(p => (
                    <Card key={p.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--ui)', fontSize: 13, letterSpacing: '.04em', color: 'var(--type)', textTransform: 'uppercase' }}>{p.name}</div>
                          <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 3 }}>{D.createdOn.replace('{date}', formatDate(p.created_at, locale))}</div>
                        </div>
                        <StatusBadge status={p.status} label={STATUS[p.status] || p.status} />
                      </div>

                      {p.notes && (
                        <p style={{ fontFamily: 'var(--body)', fontSize: 12.5, color: 'var(--type-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>{p.notes}</p>
                      )}

                      {(p.payment_orders || []).length > 0 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {p.payment_orders.map(po => (
                            <div key={po.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'var(--body)', fontSize: 12.5, color: 'var(--type)' }}>{po.descripcion || D.paymentOrderFallback}</span>
                                {Number(po.es_cargo_extra) === 1 && (
                                  <span style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: '2px 7px' }}>{D.extraCharge}</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--type)' }}>{money(po.amount, po.currency)}</span>
                                <StatusBadge status={po.status} label={STATUS[po.status] || po.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Citas ── */}
            <Section title={D.appointmentsTitle} count={appointments.length}>
              {appointments.length === 0 ? (
                <EmptyRow>{D.appointmentsEmpty}</EmptyRow>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {appointments.map(a => (
                    <Card key={a.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, letterSpacing: '.04em', color: 'var(--type)', textTransform: 'uppercase' }}>{a.service || D.callType[a.call_type] || D.appointmentFallback}</span>
                            <span style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: '2px 7px' }}>{D.callType[a.call_type] || a.call_type}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 4 }}>{formatDateTime(a.scheduled_at, locale)}</div>
                          {a.project_details && (
                            <p style={{ fontFamily: 'var(--body)', fontSize: 12.5, color: 'var(--type-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>{a.project_details}</p>
                          )}
                        </div>
                        <StatusBadge status={a.status} label={D.apptStatus[a.status] || a.status} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </PortalLayout>
  );
}
