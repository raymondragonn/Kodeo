import { useState, useEffect, useCallback } from 'react';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';

const PROJECT_STATUS = {
  en_diseno:     { label: 'En diseño',     color: 'var(--accent-blue)' },
  en_desarrollo: { label: 'En desarrollo', color: 'var(--accent-yellow)' },
  completado:    { label: 'Completado',    color: 'var(--accent-green)' },
  cancelado:     { label: 'Cancelado',     color: 'var(--type-muted)' },
};

const ORDER_STATUS = {
  pendiente: { label: 'Pendiente', color: 'var(--accent-yellow)' },
  pagado:    { label: 'Pagado',    color: '#63C44D' },
  cancelado: { label: 'Cancelado', color: 'var(--type-muted)' },
};

const money = (amount, currency = 'MXN') =>
  Number(amount).toLocaleString('es-MX', { style: 'currency', currency });

export default function ProjectsPage({
  user, copy, onNavigate, onLogout, theme, onThemeToggle,
}) {
  const token        = localStorage.getItem('token');
  const isAdmin      = user?.role === 'administrador';
  const { isMobile } = useBreakpoint();

  const [projects, setProjects]     = useState(null);
  const [error, setError]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
                  Panel de gestión
                </p>
              )}
              <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                Proyectos
              </h1>
            </div>
            <RefreshButton onClick={handleRefresh} loading={refreshing} />
          </div>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
            {isAdmin
              ? 'Crea proyectos, genera órdenes de pago con link único y da seguimiento a los cobros.'
              : 'Sigue el avance de tus proyectos y aprueba los cambios pendientes.'}
          </p>
        </div>

        {error && (
          <p style={{ ...bodyText, color: '#e05050', marginBottom: 24 }}>{error}</p>
        )}

        {/* ── Alerta destacada: cambios pendientes de aprobación ── */}
        {!isAdmin && pendingExtras.length > 0 && (
          <div style={{
            border: '1px solid rgba(255,222,89,.45)', background: 'rgba(255,222,89,.07)',
            padding: '20px 24px', marginBottom: 32,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-yellow)', margin: 0 }}>
              Tienes {pendingExtras.length === 1 ? 'una solicitud' : `${pendingExtras.length} solicitudes`} de cambio/ajuste pendiente{pendingExtras.length > 1 ? 's' : ''} de aprobación
            </p>
            {pendingExtras.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ ...bodyText, flex: 1, minWidth: 200 }}>
                  <strong style={{ color: 'var(--type)' }}>{o.project_name}</strong> — {o.descripcion} · {money(o.amount, o.currency)}
                </span>
                <button onClick={() => onNavigate?.(`/pago/orden/${o.public_token}`)} style={pillBtn}>
                  Aprobar y pagar →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Admin: crear proyecto ── */}
        {isAdmin && <NewProjectForm authFetch={authFetch} onCreated={loadProjects} />}

        {/* ── Listado ── */}
        {!projects && !error && <p style={bodyText}>Cargando proyectos…</p>}

        {projects?.length === 0 && (
          <p style={bodyText}>
            {isAdmin ? 'Aún no hay proyectos. Crea el primero arriba.' : 'Aún no tienes proyectos activos. Cuando contrates uno, aparecerá aquí.'}
          </p>
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
            />
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}

// ── Tarjeta de proyecto ─────────────────────────────────────────────────────

function ProjectCard({ project, isAdmin, authFetch, onChanged, onNavigate }) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.en_diseno;

  const updateStatus = async (newStatus) => {
    setBusy(true); setError(null);
    try {
      await authFetch(`projects.php?id=${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid var(--line)' }}>
      <div style={{ height: 3, background: status.color }} />

      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 24, letterSpacing: '-0.02em', margin: 0 }}>
            {project.name}
          </h2>
          {isAdmin && (
            <p style={{ ...hintText, marginTop: 4 }}>
              {project.user_name ? `${project.user_name} · ${project.user_email}` : 'Sin cliente asignado — se liga al abrir su link de pago'}
            </p>
          )}
          {project.notes && <p style={{ ...hintText, marginTop: 4 }}>{project.notes}</p>}
        </div>

        {isAdmin ? (
          <select
            value={project.status}
            disabled={busy}
            onChange={e => updateStatus(e.target.value)}
            style={{ ...inputStyle, width: 'auto', color: status.color }}
          >
            {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <Chip color={status.color}>{status.label}</Chip>
        )}
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
          />
        ))}
        {(project.payment_orders ?? []).length === 0 && (
          <p style={{ ...hintText, padding: '14px 24px', margin: 0 }}>Sin órdenes de pago.</p>
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
            />
          ) : (
            <button onClick={() => setShowOrderForm(true)} style={ghostBtn}>
              + Nueva orden de pago / cargo extra
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fila de orden de pago ───────────────────────────────────────────────────

function OrderRow({ order, isAdmin, authFetch, onChanged, onNavigate }) {
  const [busy, setBusy]     = useState(false);
  const [copied, setCopied] = useState(false);
  const status  = ORDER_STATUS[order.status] ?? ORDER_STATUS.pendiente;
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
    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{ ...bodyText, margin: 0 }}>
          {order.descripcion || 'Pago del proyecto'}
          {isExtra && (
            <span style={{ marginLeft: 10, fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent-yellow)' }}>
              Cargo extra
            </span>
          )}
        </p>
        <p style={{ ...hintText, margin: '3px 0 0' }}>
          {money(order.amount, order.currency)}
          {Number(order.permite_msi) === 1 && ' · MSI disponible'}
          {order.status === 'pagado' && order.paid_at && ` · Pagado el ${order.paid_at.slice(0, 10)} (${order.tipo_pago})`}
        </p>
      </div>

      <Chip color={status.color}>{status.label}</Chip>

      {order.status === 'pendiente' && !isAdmin && (
        <button onClick={() => onNavigate?.(`/pago/orden/${order.public_token}`)} style={pillBtn}>
          {isExtra ? 'Aprobar y pagar →' : 'Pagar →'}
        </button>
      )}

      {isAdmin && order.status === 'pendiente' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={copyLink} style={ghostBtn}>{copied ? '✓ Copiado' : 'Copiar link'}</button>
          <button onClick={() => patchStatus('pagado')} disabled={busy} style={ghostBtn}>Marcar pagada (transferencia)</button>
          <button onClick={() => patchStatus('cancelado')} disabled={busy} style={{ ...ghostBtn, color: '#e05050', borderColor: 'rgba(224,80,80,.4)' }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

// ── Formularios de admin ────────────────────────────────────────────────────

function NewProjectForm({ authFetch, onCreated }) {
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
    <form onSubmit={submit} style={{ border: '1px solid var(--line)', padding: 24, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ ...eyebrowStyle, margin: 0 }}>Nuevo proyecto</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del proyecto" required style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Correo del cliente (opcional)" style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas (opcional)" style={inputStyle} />
      {error && <p style={{ ...hintText, color: '#e05050', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy || !name.trim()} style={{ ...pillBtn, alignSelf: 'flex-start', opacity: busy || !name.trim() ? 0.6 : 1 }}>
        {busy ? 'Creando…' : 'Crear proyecto'}
      </button>
    </form>
  );
}

function NewOrderForm({ projectId, authFetch, onDone, onCancel }) {
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
        <p style={{ ...bodyText, margin: 0, color: '#63C44D' }}>Orden creada. Comparte este link con el cliente:</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--type)', background: 'var(--bg-2)', padding: '8px 12px', border: '1px solid var(--line)', wordBreak: 'break-all', flex: 1, minWidth: 220 }}>
            {payUrl}
          </code>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(payUrl); } catch { /* clipboard no disponible */ }
              setCopied(true); setTimeout(() => setCopied(false), 2000);
            }}
            style={ghostBtn}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          <button onClick={onDone} style={pillBtn}>Listo</button>
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
          type="number" min="10" step="0.01" placeholder="Monto (MXN)" required
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <input
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder={esExtra ? 'Descripción del cambio (ej. Módulo extra de chat)' : 'Concepto (ej. Anticipo 50%)'}
          required={esExtra}
          style={{ ...inputStyle, flex: 3, minWidth: 220 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label style={checkLabel}>
          <input type="checkbox" checked={permiteMsi} onChange={e => setPermiteMsi(e.target.checked)} />
          Permitir MSI
        </label>
        <label style={checkLabel}>
          <input type="checkbox" checked={esExtra} onChange={e => setEsExtra(e.target.checked)} />
          Es cargo extra por cambios
        </label>
      </div>
      {error && <p style={{ ...hintText, color: '#e05050', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={busy} style={{ ...pillBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Generando…' : 'Generar link de pago'}
        </button>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancelar</button>
      </div>
    </form>
  );
}

// ── Sub-componentes y estilos ───────────────────────────────────────────────

function Chip({ color, children }) {
  return (
    <span style={{
      fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em',
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
  background: 'var(--bg)', border: '1px solid var(--line)',
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
