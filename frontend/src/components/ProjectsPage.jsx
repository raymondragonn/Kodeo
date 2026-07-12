import { useState, useEffect, useCallback } from 'react';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';

const PROJECT_STATUS_COLORS = {
  en_diseno:     'var(--accent-blue)',
  en_desarrollo: 'var(--accent-yellow)',
  completado:    'var(--accent-green)',
  cancelado:     'var(--type-muted)',
};

const ORDER_STATUS_COLORS = {
  pendiente: 'var(--accent-yellow)',
  pagado:    '#63C44D',
  cancelado: 'var(--type-muted)',
};

const money = (amount, currency = 'MXN') =>
  Number(amount).toLocaleString('es-MX', { style: 'currency', currency });

export default function ProjectsPage({
  user, copy, onNavigate, onLogout, theme, onThemeToggle,
}) {
  const P = copy.portal.projects;
  const token        = localStorage.getItem('token');
  const isAdmin      = user?.role === 'administrador';
  const { isMobile } = useBreakpoint();

  const [projects, setProjects]     = useState(null);
  const [error, setError]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const authFetch = useCallback(async (path, options = {}) => {
    const res  = await fetch(`${API}/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }, [token]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await authFetch('projects.php');
      setProjects(data.projects);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [loadProjects]);

  // Cargos extras pendientes de aprobación (alerta destacada del cliente)
  const pendingExtras = (projects ?? []).flatMap(p =>
    (p.payment_orders ?? [])
      .filter(o => o.status === 'pendiente' && Number(o.es_cargo_extra) === 1)
      .map(o => ({ ...o, project_name: p.name }))
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              {isAdmin && (
                <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 6px' }}>
                  {P.adminEyebrow}
                </p>
              )}
              <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                {P.title}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowProjectForm(open => !open)}
                  style={pillBtn}
                  aria-expanded={showProjectForm}
                >
                  {showProjectForm ? P.cancel : `+ ${P.newProjectTitle}`}
                </button>
              )}
              <RefreshButton onClick={handleRefresh} loading={refreshing} />
            </div>
          </div>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
            {isAdmin ? P.subtitleAdmin : P.subtitleClient}
          </p>
        </div>

        {error && (
          <p style={{ ...bodyText, color: '#e05050', marginBottom: 24 }}>{error}</p>
        )}

        {/* ── Alerta destacada: cambios pendientes de aprobación ── */}
        {!isAdmin && pendingExtras.length > 0 && (
          <div style={{
            border: '1px solid rgba(255,222,89,.45)', background: 'rgba(255,222,89,.07)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px', marginBottom: 32,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-yellow)', margin: 0 }}>
              {pendingExtras.length === 1
                ? P.pendingExtrasOne
                : P.pendingExtrasMany.replace('{n}', pendingExtras.length)}
            </p>
            {pendingExtras.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ ...bodyText, flex: 1, minWidth: 200 }}>
                  <strong style={{ color: 'var(--type)' }}>{o.project_name}</strong> — {o.descripcion} · {money(o.amount, o.currency)}
                </span>
                <button onClick={() => onNavigate?.(`/pago/orden/${o.public_token}`)} style={pillBtn}>
                  {P.approveAndPay}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Admin: crear proyecto ── */}
        {isAdmin && showProjectForm && (
          <NewProjectForm
            authFetch={authFetch}
            onCreated={async () => {
              await loadProjects();
              setShowProjectForm(false);
            }}
            onCancel={() => setShowProjectForm(false)}
            copy={copy}
          />
        )}

        {/* ── Listado ── */}
        {!projects && !error && <p style={bodyText}>{P.loading}</p>}

        {projects?.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--type)', margin: '0 0 8px' }}>
              {isAdmin ? P.emptyTitleAdmin : P.emptyTitleClient}
            </p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
              {isAdmin ? P.emptyBodyAdmin : P.emptyBodyClient}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {projects?.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              authFetch={authFetch}
              onChanged={loadProjects}
              onNavigate={onNavigate}
              copy={copy}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}

// ── Tarjeta de proyecto ─────────────────────────────────────────────────────

function ProjectCard({ project, isAdmin, authFetch, onChanged, onNavigate, copy, isMobile }) {
  const P = copy.portal.projects;
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const statusKey   = PROJECT_STATUS_COLORS[project.status] ? project.status : 'en_diseno';
  const statusColor = PROJECT_STATUS_COLORS[statusKey];
  const statusLabel = copy.portal.status[statusKey];

  const updateStatus = async (newStatus) => {
    setBusy(true); setError(null);
    try {
      await authFetch(`projects.php?id=${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ height: 3, background: statusColor }} />

      <div style={{
        padding: isMobile ? '20px' : '24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (isAdmin ? 'minmax(220px, 1.4fr) minmax(190px, 1fr) minmax(170px, .65fr)' : 'minmax(0, 1fr) auto'),
        alignItems: 'start', gap: isMobile ? 18 : 28,
        borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.projectColumn}</p>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 24, letterSpacing: '-0.02em', margin: 0 }}>
            {project.name}
          </h2>
        </div>

        {isAdmin && (
          <div>
            <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.clientColumn}</p>
            <p style={{ ...bodyText, margin: 0, color: 'var(--type)' }}>
              {project.user_name || P.noClientAssigned}
            </p>
            {project.user_email && <p style={{ ...hintText, margin: '3px 0 0', wordBreak: 'break-word' }}>{project.user_email}</p>}
            {project.notes && <p style={{ ...hintText, margin: '10px 0 0' }}>{project.notes}</p>}
          </div>
        )}

        <div style={{ justifySelf: isMobile ? 'stretch' : 'end', width: isMobile ? '100%' : 'auto' }}>
          <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.statusColumn}</p>
          {isAdmin ? (
            <select
              value={project.status}
              disabled={busy}
              onChange={e => updateStatus(e.target.value)}
              style={{ ...inputStyle, width: isMobile ? '100%' : 170, color: statusColor }}
            >
              {Object.keys(PROJECT_STATUS_COLORS).map(value => (
                <option key={value} value={value}>{copy.portal.status[value]}</option>
              ))}
            </select>
          ) : (
            <Chip color={statusColor}>{statusLabel}</Chip>
          )}
        </div>
      </div>

      {/* Órdenes de pago */}
      <div>
        {(project.payment_orders ?? []).map(order => (
          <OrderRow
            key={order.id}
            order={order}
            isAdmin={isAdmin}
            authFetch={authFetch}
            onChanged={onChanged}
            onNavigate={onNavigate}
            copy={copy}
            isMobile={isMobile}
          />
        ))}
        {(project.payment_orders ?? []).length === 0 && (
          <p style={{ ...hintText, padding: '14px 24px', margin: 0 }}>{P.noOrders}</p>
        )}
      </div>

      {error && <p style={{ ...hintText, color: '#e05050', padding: '0 24px 12px', margin: 0 }}>{error}</p>}

      {isAdmin && (
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
          {showOrderForm ? (
            <NewOrderForm
              projectId={project.id}
              authFetch={authFetch}
              onDone={() => { setShowOrderForm(false); onChanged(); }}
              onCancel={() => setShowOrderForm(false)}
              copy={copy}
            />
          ) : (
            <button onClick={() => setShowOrderForm(true)} style={ghostBtn}>
              {P.newOrderBtn}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fila de orden de pago ───────────────────────────────────────────────────

function OrderRow({ order, isAdmin, authFetch, onChanged, onNavigate, copy, isMobile }) {
  const P = copy.portal.projects;
  const [busy, setBusy]     = useState(false);
  const [copied, setCopied] = useState(false);
  const statusKey   = ORDER_STATUS_COLORS[order.status] ? order.status : 'pendiente';
  const statusColor = ORDER_STATUS_COLORS[statusKey];
  const statusLabel = copy.portal.status[statusKey];
  const isExtra = Number(order.es_cargo_extra) === 1;
  const payUrl  = `${window.location.origin}/pago/orden/${order.public_token}`;

  const patchStatus = async (newStatus) => {
    setBusy(true);
    try {
      await authFetch(`payment-orders.php?id=${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      onChanged();
    } catch { /* el recargado mostrará el estado real */ onChanged(); }
    finally { setBusy(false); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(payUrl); } catch { /* clipboard no disponible */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      padding: isMobile ? '16px 20px' : '16px 24px', borderTop: '1px solid var(--line)',
      display: 'grid', alignItems: 'center', gap: isMobile ? 12 : 20,
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 1fr) auto minmax(220px, auto)',
    }}>
      <div>
        <p style={{ ...bodyText, margin: 0 }}>
          {order.descripcion || P.defaultOrderDesc}
          {isExtra && (
            <span style={{ marginLeft: 10, fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-yellow)' }}>
              {P.extraChargeTag}
            </span>
          )}
        </p>
        <p style={{ ...hintText, margin: '3px 0 0' }}>
          {money(order.amount, order.currency)}
          {Number(order.permite_msi) === 1 && ` · ${P.msiAvailable}`}
          {order.status === 'pagado' && order.paid_at && ` · ${P.paidOn.replace('{date}', order.paid_at.slice(0, 10)).replace('{type}', order.tipo_pago)}`}
        </p>
      </div>

      <div style={{ justifySelf: isMobile ? 'start' : 'center' }}><Chip color={statusColor}>{statusLabel}</Chip></div>

      {order.status === 'pendiente' && !isAdmin && (
        <button onClick={() => onNavigate?.(`/pago/orden/${order.public_token}`)} style={{ ...pillBtn, justifySelf: isMobile ? 'start' : 'end' }}>
          {isExtra ? P.approveAndPay : P.pay}
        </button>
      )}

      {isAdmin && order.status === 'pendiente' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <button onClick={copyLink} style={ghostBtn}>{copied ? P.copied : P.copyLink}</button>
          <button onClick={() => patchStatus('pagado')} disabled={busy} style={ghostBtn}>{P.markPaid}</button>
          <button onClick={() => patchStatus('cancelado')} disabled={busy} style={{ ...ghostBtn, color: '#e05050', borderColor: 'rgba(224,80,80,.4)' }}>{P.cancel}</button>
        </div>
      )}
    </div>
  );
}

// ── Formularios de admin ────────────────────────────────────────────────────

function NewProjectForm({ authFetch, onCreated, onCancel, copy }) {
  const P = copy.portal.projects;
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await authFetch('projects.php', {
        method: 'POST',
        body: JSON.stringify({ name, user_email: email, notes }),
      });
      setName(''); setEmail(''); setNotes('');
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ ...eyebrowStyle, margin: 0 }}>{P.newProjectTitle}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={P.projectNamePlaceholder} required style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={P.clientEmailPlaceholder} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={P.internalNotesPlaceholder} style={inputStyle} />
      {error && <p style={{ ...hintText, color: '#e05050', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy || !name.trim()} style={{ ...pillBtn, opacity: busy || !name.trim() ? 0.6 : 1 }}>
          {busy ? P.creating : P.createProject}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} style={{ ...pillBtn, background: 'transparent', color: 'var(--type-soft)' }}>
          {P.cancel}
        </button>
      </div>
    </form>
  );
}

function NewOrderForm({ projectId, authFetch, onDone, onCancel, copy }) {
  const P = copy.portal.projects;
  const [amount, setAmount]       = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permiteMsi, setPermiteMsi]   = useState(true);
  const [esExtra, setEsExtra]     = useState(false);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState(null);
  const [payUrl, setPayUrl]       = useState(null);
  const [copied, setCopied]       = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await authFetch('payment-orders.php', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          amount: Number(amount),
          descripcion,
          permite_msi: permiteMsi,
          es_cargo_extra: esExtra,
        }),
      });
      setPayUrl(data.pay_url);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (payUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...bodyText, margin: 0, color: '#63C44D' }}>{P.orderCreated}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--type)', background: 'var(--bg-2)', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius)', wordBreak: 'break-all', flex: 1, minWidth: 220 }}>
            {payUrl}
          </code>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(payUrl); } catch { /* clipboard no disponible */ }
              setCopied(true); setTimeout(() => setCopied(false), 2000);
            }}
            style={ghostBtn}
          >
            {copied ? P.copied : P.copy}
          </button>
          <button onClick={onDone} style={pillBtn}>{P.done}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          type="number" min="10" step="0.01" placeholder={P.amountPlaceholder} required
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <input
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder={esExtra ? P.extraDescPlaceholder : P.conceptPlaceholder}
          required={esExtra}
          style={{ ...inputStyle, flex: 3, minWidth: 220 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label style={checkLabel}>
          <input type="checkbox" checked={permiteMsi} onChange={e => setPermiteMsi(e.target.checked)} />
          {P.allowMsi}
        </label>
        <label style={checkLabel}>
          <input type="checkbox" checked={esExtra} onChange={e => setEsExtra(e.target.checked)} />
          {P.isExtraCharge}
        </label>
      </div>
      {error && <p style={{ ...hintText, color: '#e05050', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={busy} style={{ ...pillBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? P.generating : P.generatePayLink}
        </button>
        <button type="button" onClick={onCancel} style={ghostBtn}>{P.cancel}</button>
      </div>
    </form>
  );
}

// ── Sub-componentes y estilos ───────────────────────────────────────────────

function Chip({ color, children }) {
  return (
    <span style={{
      fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em',
      textTransform: 'uppercase', color,
      border: `1px solid ${color}`, borderRadius: 'var(--radius-pill)',
      padding: '5px 12px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

const eyebrowStyle = {
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em',
  textTransform: 'uppercase', color: 'var(--type-soft)', margin: '0 0 14px',
};

const bodyText = {
  fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', lineHeight: 1.6,
};

const hintText = {
  fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', lineHeight: 1.5,
};

const inputStyle = {
  padding: '11px 14px',
  background: 'var(--bg-2)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--body)', fontSize: 14,
  color: 'var(--type)', outline: 'none', boxSizing: 'border-box',
};

const pillBtn = {
  padding: '10px 20px',
  background: 'var(--type)', color: 'var(--bg)',
  border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const ghostBtn = {
  padding: '9px 18px',
  background: 'none', color: 'var(--type-soft)',
  border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const checkLabel = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', cursor: 'pointer',
};
