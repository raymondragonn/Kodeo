import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import ConfirmModal from './ConfirmModal';
import ViewModeSwitch from './ViewModeSwitch';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_BASE_URL as API } from '../lib/api';
import Icon from './Icon';

// Diagnóstico = amarillo, diseño = verde, desarrollo = rojo, despliegue (completado) = azul.
// Colores vivos: para usos decorativos (barra superior, punto de la tabla) —
// no llevan texto encima, así que no necesitan la variante de alto contraste.
const PROJECT_STATUS_COLORS = {
  diagnostico:   'var(--accent-yellow)',
  en_diseno:     'var(--accent-green)',
  en_desarrollo: 'var(--accent-red)',
  completado:    'var(--accent-blue)',
  cancelado:     'var(--type-muted)',
};

// Mismos colores en su variante legible como texto (los acentos vivos pierden
// contraste sobre fondo claro) — usados en el <select> y el Chip de estatus.
const PROJECT_STATUS_TEXT_COLORS = {
  diagnostico:   'var(--accent-yellow-text)',
  en_diseno:     'var(--accent-green-text)',
  en_desarrollo: 'var(--accent-red-text)',
  completado:    'var(--accent-blue-text)',
  cancelado:     'var(--type-muted)',
};

// Orden obligatorio de avance — 'cancelado' es la única excepción, se puede
// colocar desde cualquier estatus (debe reflejar backend/projects.php).
const PROJECT_STATUS_ORDER = ['diagnostico', 'en_diseno', 'en_desarrollo', 'completado'];

const ORDER_STATUS_COLORS = {
  pendiente: 'var(--accent-yellow-text)',
  pagado:    'var(--accent-green-text)',
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
  const [view, setView] = useState('cards');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [openProjectId, setOpenProjectId] = useState(null);
  const [clients, setClients]       = useState([]);

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

  // Lista de clientes registrados — alimenta el datalist de asignación (nuevo
  // proyecto y reasignación en el detalle), sin bloquear si falla (queda el
  // campo de correo libre como respaldo).
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await authFetch('users.php');
        setClients((data.users ?? []).filter(u => u.role === 'cliente'));
      } catch { /* el campo de correo libre sigue funcionando */ }
    })();
  }, [isAdmin, authFetch]);

  // Cargos extras pendientes de aprobación (alerta destacada del cliente)
  const pendingExtras = (projects ?? []).flatMap(p =>
    (p.payment_orders ?? [])
      .filter(o => o.status === 'pendiente' && Number(o.es_cargo_extra) === 1)
      .map(o => ({ ...o, project_name: p.name }))
  );

  // Filtro por subestado (solo admin) — cancelado no aplica: esos proyectos
  // ya no se cargan desde el backend.
  const STATUS_FILTERS = [
    { key: 'todos', label: P.filterAll, count: (projects ?? []).length },
    ...PROJECT_STATUS_ORDER.map(key => ({
      key,
      label: copy.portal.status[key],
      count: (projects ?? []).filter(p => p.status === key).length,
    })),
  ];
  const filteredProjects = statusFilter === 'todos'
    ? (projects ?? [])
    : (projects ?? []).filter(p => p.status === statusFilter);

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
              {projects?.length > 0 && (
                <ViewModeSwitch
                  value={view}
                  onChange={setView}
                  options={[
                    { id: 'cards', label: P.viewCards, icon: 'grid' },
                    { id: 'table', label: P.viewTable, icon: 'list' },
                  ]}
                />
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
            <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-yellow-text)', margin: 0 }}>
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
            clients={clients}
          />
        )}

        {/* ── Filtro por subestado (solo admin) ── */}
        {isAdmin && projects?.length > 0 && (
          <div style={{
            display: 'flex', gap: 3, background: 'var(--bg-2)', border: '1px solid var(--line)',
            borderRadius: isMobile ? 'var(--radius-lg)' : 'var(--radius-pill)', padding: 3,
            marginBottom: 24, flexWrap: 'wrap', width: isMobile ? '100%' : 'fit-content',
          }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={{
                  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
                  padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: 0, cursor: 'pointer',
                  background: statusFilter === f.key ? 'var(--type)' : 'transparent',
                  color:      statusFilter === f.key ? 'var(--bg)'   : 'var(--type-muted)',
                  transition: 'background .2s, color .2s',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}
              >
                {f.label}
                <span style={{ fontSize: 9, opacity: statusFilter === f.key ? .7 : .5 }}>{f.count}</span>
              </button>
            ))}
          </div>
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

        {projects?.length > 0 && filteredProjects.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0 }}>
              {P.emptyFilter}
            </p>
          </div>
        )}

        {filteredProjects.length > 0 && (
          view === 'table' ? (
            <ProjectsTable
              projects={filteredProjects}
              isAdmin={isAdmin}
              authFetch={authFetch}
              onChanged={loadProjects}
              onOpenDetail={isAdmin ? setOpenProjectId : undefined}
              copy={copy}
              isMobile={isMobile}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdmin={isAdmin}
                  authFetch={authFetch}
                  onChanged={loadProjects}
                  onNavigate={onNavigate}
                  onOpenDetail={isAdmin ? setOpenProjectId : undefined}
                  copy={copy}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )
        )}
      </div>

      {openProjectId && (
        <ProjectDetailModal
          projectId={openProjectId}
          authFetch={authFetch}
          onClose={() => setOpenProjectId(null)}
          onChanged={loadProjects}
          copy={copy}
          isMobile={isMobile}
          clients={clients}
        />
      )}
    </PortalLayout>
  );
}

// ── Detalle del proyecto (modal): fechas, reasignación, notas y bitácora ───

const formatDate = (value, locale) =>
  value ? new Date(value.replace(' ', 'T')).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function ProjectDetailModal({ projectId, authFetch, onClose, onChanged, copy, isMobile, clients }) {
  const P = copy.portal.projects;
  const [project, setProject]   = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);

  const [reassignEmail, setReassignEmail] = useState('');
  const [reassignName, setReassignName]   = useState('');
  const [reassigning, setReassigning]     = useState(false);
  const [reassignMsg, setReassignMsg]     = useState('');

  const [notes, setNotes]           = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMsg, setNotesMsg]     = useState('');

  const load = useCallback(async () => {
    try {
      const data = await authFetch(`projects.php?id=${projectId}`);
      setProject(data.project);
      setNotes(data.project.notes ?? '');
      setReassignEmail(data.project.user_email ?? '');
      setReassignName(data.project.user_id ? '' : (data.project.client_name ?? ''));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [authFetch, projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const refreshAll = useCallback(async () => {
    await load();
    onChanged();
  }, [load, onChanged]);

  const { busy, error, confirmingCancel, setConfirmingCancel, updateStatus, handleStatusChange } =
    useProjectStatus(authFetch, project ?? {}, refreshAll);

  const handleReassign = async () => {
    setReassigning(true); setReassignMsg('');
    try {
      await authFetch(`projects.php?id=${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ user_email: reassignEmail.trim(), client_name: reassignName.trim() }),
      });
      setReassignMsg(P.reassigned);
      await refreshAll();
    } catch (err) {
      setReassignMsg(err.message);
    } finally {
      setReassigning(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true); setNotesMsg('');
    try {
      await authFetch(`projects.php?id=${projectId}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      setNotesMsg(P.notesSaved);
      await refreshAll();
    } catch (err) {
      setNotesMsg(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: isMobile ? 0 : '1px solid var(--line)',
          borderRadius: isMobile ? 0 : 'var(--radius-lg)', maxWidth: 640, width: '100%',
          height: isMobile ? '100vh' : 'auto', maxHeight: isMobile ? '100vh' : 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: isMobile ? 'none' : '0 24px 48px -12px rgba(0,0,0,.4)',
        }}
      >
        {!project ? (
          <p style={{ ...bodyText, padding: 40 }}>{loadError || P.detailLoading}</p>
        ) : (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14,
              padding: isMobile ? '20px' : '24px', borderBottom: '1px solid var(--line)',
              flexShrink: 0, background: 'var(--bg)',
            }}>
              <div>
                <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.detailTitle}</p>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 26, letterSpacing: '-0.02em', margin: 0 }}>
                  {project.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="close"
                style={{
                  width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1px solid var(--line)', borderRadius: '50%',
                  color: 'var(--type-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>

            <div style={{
              padding: isMobile ? '18px 20px' : '20px 24px', borderBottom: '1px solid var(--line)',
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16,
            }}>
              <div>
                <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.statusColumn}</p>
                <StatusSelect project={project} busy={busy} onChange={handleStatusChange} copy={copy} style={{ width: '100%' }} />
                {error && <p style={{ ...hintText, color: '#e05050', margin: '6px 0 0' }}>{error}</p>}
              </div>
              <div>
                <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.assignedClientLabel}</p>
                <p style={{ ...bodyText, margin: 0 }}>
                  {project.user_name ? `${project.user_name} (${project.user_email})` : P.noClientAssigned}
                </p>
              </div>
              <div>
                <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.createdLabel}</p>
                <p style={{ ...bodyText, margin: 0 }}>{formatDate(project.created_at, copy.portal.locale)}</p>
              </div>
              <div>
                <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.updatedLabel}</p>
                <p style={{ ...bodyText, margin: 0 }}>{formatDate(project.updated_at, copy.portal.locale)}</p>
              </div>
            </div>

            <div style={{ padding: isMobile ? '18px 20px' : '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ ...eyebrowStyle, margin: '0 0 10px' }}>{P.reassignLabel}</p>
              <p style={{ ...hintText, margin: '0 0 10px' }}>{P.reassignHint}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={reassignName}
                  onChange={e => setReassignName(e.target.value)}
                  placeholder={P.reassignNamePlaceholder}
                  style={{ ...inputStyle, flex: 1, minWidth: 180 }}
                />
                <input
                  value={reassignEmail}
                  onChange={e => setReassignEmail(e.target.value)}
                  placeholder={P.reassignPlaceholder}
                  list="project-detail-clients"
                  style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                />
                <datalist id="project-detail-clients">
                  {clients.map(c => <option key={c.id} value={c.email}>{c.name}</option>)}
                </datalist>
                <button onClick={handleReassign} disabled={reassigning} style={{ ...pillBtn, opacity: reassigning ? 0.6 : 1 }}>
                  {reassigning ? P.reassigning : P.reassignBtn}
                </button>
              </div>
              {reassignMsg && <p style={{ ...hintText, margin: '8px 0 0' }}>{reassignMsg}</p>}
            </div>

            <div style={{ padding: isMobile ? '18px 20px' : '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ ...eyebrowStyle, margin: '0 0 10px' }}>{P.notesLabel}</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={P.notesPlaceholder}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <button onClick={handleSaveNotes} disabled={savingNotes} style={ghostBtn}>
                  {savingNotes ? P.savingNotes : P.saveNotes}
                </button>
                {notesMsg && <span style={hintText}>{notesMsg}</span>}
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--line)' }}>
              <p style={{ ...eyebrowStyle, margin: 0, padding: isMobile ? '18px 20px 0' : '20px 24px 0' }}>{P.ordersColumn}</p>
              {(project.payment_orders ?? []).map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isAdmin
                  authFetch={authFetch}
                  onChanged={refreshAll}
                  copy={copy}
                  isMobile={isMobile}
                />
              ))}
              {(project.payment_orders ?? []).length === 0 && (
                <p style={{ ...hintText, padding: '14px 24px', margin: 0 }}>{P.noOrders}</p>
              )}
              <div style={{ padding: isMobile ? '14px 20px' : '14px 24px' }}>
                {showOrderForm ? (
                  <NewOrderForm
                    projectId={project.id}
                    authFetch={authFetch}
                    onDone={() => { setShowOrderForm(false); refreshAll(); }}
                    onCancel={() => setShowOrderForm(false)}
                    copy={copy}
                  />
                ) : (
                  <button onClick={() => setShowOrderForm(true)} style={ghostBtn}>{P.newOrderBtn}</button>
                )}
              </div>
            </div>

            {project.status === 'completado' && (
              <div style={{ borderBottom: '1px solid var(--line)' }}>
                <ReviewSection project={project} authFetch={authFetch} onChanged={refreshAll} copy={copy} />
              </div>
            )}

            <div style={{ padding: isMobile ? '18px 20px' : '20px 24px' }}>
              <p style={{ ...eyebrowStyle, margin: '0 0 12px' }}>{P.activityTitle}</p>
              {(project.activity ?? []).length === 0 && <p style={hintText}>{P.activityEmpty}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(project.activity ?? []).map(entry => (
                  <div key={entry.id} style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                    <span style={{ ...hintText, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatDate(entry.created_at, copy.portal.locale)}
                    </span>
                    <span style={bodyText}>{entry.detail}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </>
        )}
      </div>

      {confirmingCancel && (
        <ConfirmModal
          title={P.cancelProjectTitle}
          message={P.confirmCancelProject}
          confirmLabel={busy ? P.cancelling : P.cancel}
          cancelLabel={P.keepProject}
          busy={busy}
          onConfirm={() => updateStatus('cancelado')}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </div>,
    document.body
  );
}

// ── Estado del proyecto: compartido entre tarjeta y fila de tabla ──────────

function useProjectStatus(authFetch, project, onChanged) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const updateStatus = async (newStatus) => {
    setBusy(true); setError(null);
    try {
      await authFetch(`projects.php?id=${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); setConfirmingCancel(false); }
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'cancelado') { setConfirmingCancel(true); return; }
    updateStatus(newStatus);
  };

  return { busy, error, confirmingCancel, setConfirmingCancel, updateStatus, handleStatusChange };
}

function StatusSelect({ project, busy, onChange, copy, style }) {
  const canMoveToDesign = !!project.has_confirmed_payment;
  const statusColor = PROJECT_STATUS_TEXT_COLORS[project.status] ?? PROJECT_STATUS_TEXT_COLORS.en_diseno;
  const currentIdx  = PROJECT_STATUS_ORDER.indexOf(project.status);
  const nextStatus  = currentIdx >= 0 ? PROJECT_STATUS_ORDER[currentIdx + 1] : undefined;

  // Solo se puede avanzar al siguiente estatus de la línea, quedarse en el
  // actual, o cancelar — nunca saltar pasos ni retroceder.
  const isOptionDisabled = (value) => {
    if (value === project.status || value === 'cancelado') return false;
    if (value !== nextStatus) return true;
    return value === 'en_diseno' && !canMoveToDesign;
  };

  return (
    <select
      value={project.status}
      disabled={busy}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, color: statusColor, ...style }}
    >
      {Object.keys(PROJECT_STATUS_COLORS).map(value => (
        <option key={value} value={value} disabled={isOptionDisabled(value)}>
          {copy.portal.status[value]}
        </option>
      ))}
    </select>
  );
}

// ── Tarjeta de proyecto ─────────────────────────────────────────────────────

function ProjectCard({ project, isAdmin, authFetch, onChanged, onNavigate, onOpenDetail, copy, isMobile }) {
  const P = copy.portal.projects;
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { busy, error, confirmingCancel, setConfirmingCancel, updateStatus, handleStatusChange } =
    useProjectStatus(authFetch, project, onChanged);
  const canMoveToDesign = !!project.has_confirmed_payment;
  const statusKey   = PROJECT_STATUS_COLORS[project.status] ? project.status : 'en_diseno';
  const barColor    = PROJECT_STATUS_COLORS[statusKey];
  const textColor   = PROJECT_STATUS_TEXT_COLORS[statusKey];
  const statusLabel = copy.portal.status[statusKey];

  return (
    <div
      onClick={() => onOpenDetail?.(project.id)}
      style={{
        border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        cursor: onOpenDetail ? 'pointer' : 'default',
      }}
    >
      <div style={{ height: 3, background: barColor }} />

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

        <div
          onClick={e => e.stopPropagation()}
          style={{ justifySelf: isMobile ? 'stretch' : 'end', width: isMobile ? '100%' : 'auto' }}
        >
          <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.statusColumn}</p>
          {isAdmin ? (
            <StatusSelect
              project={project}
              busy={busy}
              onChange={handleStatusChange}
              copy={copy}
              style={{ width: isMobile ? '100%' : 170 }}
            />
          ) : (
            <Chip color={textColor}>{statusLabel}</Chip>
          )}
        </div>
      </div>

      {isAdmin && project.status === 'diagnostico' && !canMoveToDesign && (
        <div style={{
          padding: isMobile ? '14px 20px' : '14px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'rgba(255,222,89,.06)',
        }}>
          <p style={{ ...hintText, margin: 0, color: 'var(--accent-yellow-text)' }}>
            {P.designLockedUntilPaid}
          </p>
        </div>
      )}

      <div onClick={e => e.stopPropagation()}>
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

        {isAdmin && project.status === 'completado' && (
          <ReviewSection project={project} authFetch={authFetch} onChanged={onChanged} copy={copy} compact />
        )}

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

      {confirmingCancel && (
        <ConfirmModal
          title={P.cancelProjectTitle}
          message={P.confirmCancelProject}
          confirmLabel={busy ? P.cancelling : P.cancel}
          cancelLabel={P.keepProject}
          busy={busy}
          onConfirm={() => updateStatus('cancelado')}
          onCancel={() => setConfirmingCancel(false)}
        />
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
            <span style={{ marginLeft: 10, fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-yellow-text)' }}>
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

// ── Vista de tabla ───────────────────────────────────────────────────────────

function orderSummary(orders, P) {
  if (!orders || orders.length === 0) {
    return <span style={hintText}>{P.noOrders}</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {orders.map(order => (
        <Chip key={order.id} color={ORDER_STATUS_COLORS[order.status] ?? ORDER_STATUS_COLORS.pendiente}>
          {money(order.amount, order.currency)}
        </Chip>
      ))}
    </div>
  );
}

function ReviewCell({ project, authFetch, onChanged, P }) {
  const [busy, setBusy]     = useState(false);
  const [copied, setCopied] = useState(false);
  const review = project.review;

  const generate = async () => {
    setBusy(true);
    try {
      await authFetch(`projects.php?id=${project.id}`, { method: 'POST' });
      onChanged();
    } catch { /* el recargado mostrará el estado real */ }
    finally { setBusy(false); }
  };

  const copyLink = async url => {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard no disponible */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!review) {
    return (
      <button onClick={generate} disabled={busy} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 10 }}>
        {busy ? P.generatingReview : P.generateReview}
      </button>
    );
  }

  if (!review.submitted_at) {
    const url = `${window.location.origin}/resena/${review.public_token}`;
    return (
      <button onClick={() => copyLink(url)} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 10 }}>
        {copied ? P.copied : P.copyLink}
      </button>
    );
  }

  const tooltip = [review.feedback, review.mejoras].filter(Boolean).join(' — ') || P.reviewNoComment;
  return (
    <div title={tooltip}>
      <MiniStars value={review.rating} size={12} />
    </div>
  );
}

function ProjectsTable({ projects, isAdmin, authFetch, onChanged, onOpenDetail, copy, isMobile }) {
  const P = copy.portal.projects;
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? (isAdmin ? 680 : 460) : 'auto' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>{P.projectColumn}</th>
              {isAdmin && <th style={thStyle}>{P.clientColumn}</th>}
              <th style={thStyle}>{P.statusColumn}</th>
              <th style={thStyle}>{P.ordersColumn}</th>
              {isAdmin && <th style={thStyle}>{P.reviewTitle}</th>}
              <th style={{ ...thStyle, textAlign: 'right' }}>{P.createdColumn}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <ProjectsTableRow
                key={project.id}
                project={project}
                isAdmin={isAdmin}
                authFetch={authFetch}
                onChanged={onChanged}
                onOpenDetail={onOpenDetail}
                copy={copy}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectsTableRow({ project, isAdmin, authFetch, onChanged, onOpenDetail, copy }) {
  const P = copy.portal.projects;
  const [hovered, setHovered] = useState(false);
  const { busy, error, confirmingCancel, setConfirmingCancel, updateStatus, handleStatusChange } =
    useProjectStatus(authFetch, project, onChanged);
  const statusKey   = PROJECT_STATUS_COLORS[project.status] ? project.status : 'en_diseno';
  const barColor    = PROJECT_STATUS_COLORS[statusKey];
  const textColor   = PROJECT_STATUS_TEXT_COLORS[statusKey];
  const statusLabel = copy.portal.status[statusKey];

  return (
    <>
      <tr
        onClick={() => onOpenDetail?.(project.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderBottom: '1px solid var(--line)', background: hovered ? 'var(--bg-2)' : 'transparent',
          transition: 'background .15s', cursor: onOpenDetail ? 'pointer' : 'default',
        }}
      >
        <td style={tdStyle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: barColor, flexShrink: 0 }} />
            {project.name}
          </span>
        </td>
        {isAdmin && (
          <td style={tdStyle}>
            {project.user_name || <span style={{ color: 'var(--type-muted)' }}>{P.noClientAssigned}</span>}
            {project.user_email && <div style={{ fontSize: 11, color: 'var(--type-muted)', marginTop: 2 }}>{project.user_email}</div>}
          </td>
        )}
        <td style={tdStyle} onClick={e => e.stopPropagation()}>
          {isAdmin ? (
            <StatusSelect project={project} busy={busy} onChange={handleStatusChange} copy={copy} style={{ width: 150 }} />
          ) : (
            <Chip color={textColor}>{statusLabel}</Chip>
          )}
        </td>
        <td style={tdStyle}>{orderSummary(project.payment_orders, P)}</td>
        {isAdmin && (
          <td style={tdStyle} onClick={e => e.stopPropagation()}>
            {project.status === 'completado'
              ? <ReviewCell project={project} authFetch={authFetch} onChanged={onChanged} P={P} />
              : <span style={hintText}>—</span>}
          </td>
        )}
        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--type-muted)', fontSize: 12 }}>
          {(project.created_at || '').slice(0, 10)}
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={isAdmin ? 6 : 4} style={{ ...tdStyle, color: '#e05050', paddingTop: 0 }}>{error}</td>
        </tr>
      )}

      {confirmingCancel && (
        <ConfirmModal
          title={P.cancelProjectTitle}
          message={P.confirmCancelProject}
          confirmLabel={busy ? P.cancelling : P.cancel}
          cancelLabel={P.keepProject}
          busy={busy}
          onConfirm={() => updateStatus('cancelado')}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </>
  );
}

// ── Formularios de admin ────────────────────────────────────────────────────

function NewProjectForm({ authFetch, onCreated, onCancel, copy, clients }) {
  const P = copy.portal.projects;
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await authFetch('projects.php', {
        method: 'POST',
        body: JSON.stringify({ name, user_email: email, client_name: clientName, notes }),
      });
      setName(''); setEmail(''); setClientName(''); setNotes('');
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ ...eyebrowStyle, margin: 0 }}>{P.newProjectTitle}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={P.projectNamePlaceholder} required style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
        <input
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          placeholder={P.clientNamePlaceholder}
          style={{ ...inputStyle, flex: 2, minWidth: 180 }}
        />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          placeholder={P.clientEmailPlaceholder}
          list="new-project-clients"
          style={{ ...inputStyle, flex: 2, minWidth: 200 }}
        />
        <datalist id="new-project-clients">
          {(clients ?? []).map(c => <option key={c.id} value={c.email}>{c.name}</option>)}
        </datalist>
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

// Solo se puede generar/ver una vez que el proyecto está 'completado' — es
// la única puerta de entrada a la encuesta, y el admin decide cuándo
// generar el link y cómo compartirlo (copiar, WhatsApp, etc.), sin correo automático.
function ReviewSection({ project, authFetch, onChanged, copy, compact = false }) {
  const P = copy.portal.projects;
  const [busy, setBusy]     = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState('');
  const review = project.review;

  const generate = async () => {
    setBusy(true); setError('');
    try {
      await authFetch(`projects.php?id=${project.id}`, { method: 'POST' });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async url => {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard no disponible */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!review) {
    return (
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
        <button onClick={generate} disabled={busy} style={ghostBtn}>
          {busy ? P.generatingReview : P.generateReview}
        </button>
        {error && <p style={{ ...hintText, color: '#e05050', margin: '8px 0 0' }}>{error}</p>}
      </div>
    );
  }

  if (!review.submitted_at) {
    const url = `${window.location.origin}/resena/${review.public_token}`;
    return (
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
        <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.reviewTitle}</p>
        <p style={{ ...hintText, margin: '0 0 10px' }}>{P.reviewGenerated}</p>
        <button onClick={() => copyLink(url)} style={ghostBtn}>{copied ? P.copied : P.copyLink}</button>
      </div>
    );
  }

  const expectativasLabel = copy.review.expectativasOptions[review.expectativas] ?? review.expectativas;

  return (
    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
      <p style={{ ...eyebrowStyle, margin: '0 0 7px' }}>{P.reviewTitle}</p>
      <MiniStars value={review.rating} />

      {!compact && (
        <>
          <p style={{ ...bodyText, margin: '8px 0 12px' }}>{review.feedback || P.reviewNoComment}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <ReviewSubRating label={P.reviewComunicacion} value={review.rating_comunicacion} />
            <ReviewSubRating label={P.reviewDiseno} value={review.rating_diseno} />
            <ReviewSubRating label={P.reviewVelocidad} value={review.rating_velocidad} />
            <p style={{ ...hintText, margin: 0 }}>{P.reviewExpectativas}: <span style={{ color: 'var(--type)' }}>{expectativasLabel}</span></p>
          </div>

          {review.mejoras && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ ...hintText, margin: '0 0 4px' }}>{P.reviewMejoras}</p>
              <p style={{ ...bodyText, margin: 0 }}>{review.mejoras}</p>
            </div>
          )}

          <p style={{ ...hintText, margin: 0, color: review.puede_publicar ? 'var(--accent-green-text)' : 'var(--type-muted)' }}>
            {Number(review.puede_publicar) === 1 ? P.reviewPublicarSi : P.reviewPublicarNo}
          </p>
        </>
      )}
    </div>
  );
}

function MiniStars({ value, size = 16 }) {
  const rating = Number(value ?? 0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} width={size} height={size} viewBox="0 0 24 24"
          fill={star <= rating ? 'var(--accent-yellow, #FFDE59)' : 'none'}
          stroke={star <= rating ? 'var(--accent-yellow, #FFDE59)' : 'var(--type-soft)'}
          strokeWidth="1.5" strokeLinejoin="round">
          <path d="M12 2.5l2.9 6.24 6.6.72-4.9 4.6 1.3 6.6L12 17.6l-5.9 3.06 1.3-6.6-4.9-4.6 6.6-.72L12 2.5z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewSubRating({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ ...hintText, minWidth: 130 }}>{label}</span>
      <MiniStars value={value} size={13} />
    </div>
  );
}

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

const thStyle = {
  textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap',
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
  color: 'var(--type-muted)',
};

const tdStyle = {
  padding: '14px 16px', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)',
};
