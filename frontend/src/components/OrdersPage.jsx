import { useState, useEffect, useRef, useCallback } from 'react';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import { formatDMY } from '../utils/deliveryDate';
import { API_BASE_URL as API } from '../lib/api';

const STATUS_MAP = {
  pendiente:  { bg: 'rgba(148,163,184,0.1)', color: '#64748b', border: 'rgba(148,163,184,0.3)' },
  en_proceso: { bg: 'rgba(234,179,8,0.1)',   color: '#ca8a04', border: 'rgba(234,179,8,0.3)'   },
  completado: { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a', border: 'rgba(34,197,94,0.3)'   },
  cancelado:  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.3)'   },
};

const KANBAN_COLS = ['pendiente', 'en_proceso', 'completado', 'cancelado'];
const SERVICES    = ['Landing Page', 'Sitio Web', 'Tienda Online'];

// ── HOOK RESPONSIVE ───────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    // Safari < 14 uses addListener
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);
  return isMobile;
}

// ── CSS GLOBAL (keyframes + media queries que no se pueden hacer inline) ──────

// ── BADGES & HELPERS ──────────────────────────────────────────────────────────
function StatusBadge({ status, copy }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pendiente;
  const label = copy.portal.status[status] ?? copy.portal.status.pendiente;
  return (
    <span style={{
      fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 'var(--radius-pill)',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0,
      WebkitUserSelect: 'none', userSelect: 'none',
    }}>{label}</span>
  );
}

function ViewIcon({ type, active }) {
  const color = active ? 'var(--type)' : 'var(--type-muted)';
  if (type === 'list') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill={color} stroke="none"/><circle cx="3" cy="12" r="1" fill={color} stroke="none"/><circle cx="3" cy="18" r="1" fill={color} stroke="none"/>
    </svg>
  );
  if (type === 'kanban') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
const STEPS = ['pendiente', 'en_proceso', 'completado'];

function ProgressBar({ status, copy }) {
  if (status === 'cancelado') return (
    <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: '#dc2626', marginTop: 10 }}>{copy.portal.orders.orderCancelled}</div>
  );
  const cur = STEPS.indexOf(status);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((s, i) => {
          const done = i <= cur; const active = i === cur;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--type)' : 'var(--bg-3)',
                border: `2px solid ${done ? 'var(--type)' : 'var(--line)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s',
                boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
              }}>
                {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < cur ? 'var(--type)' : 'var(--line)', transition: 'background 0.3s' }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
            color: i <= cur ? 'var(--type)' : 'var(--type-muted)',
            textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center', flex: 1,
          }}>{copy.portal.status[s]}</span>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN: fila editable ──────────────────────────────────────────────────────
function AdminRow({ order, onSave, copy }) {
  const O = copy.portal.orders;
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    status: order.status, start_date: order.start_date ?? '',
    delivery_date: order.delivery_date ?? '', notes: order.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(order.id, form);
    setSaving(false);
    if (ok) setEditing(false);
  };
  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
    color: 'var(--type)', fontFamily: 'var(--body)', fontSize: 13, padding: '8px 10px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    WebkitAppearance: 'none', appearance: 'none',
  };
  return (
    <div className="kd-card" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-2)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--type)' }}>{order.service}</span>
            <StatusBadge status={editing ? form.status : order.status} copy={copy}/>
          </div>
          <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            #{order.id} · <strong style={{ color: 'var(--type-soft)' }}>{order.username}</strong> · {order.user_email}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 17, letterSpacing: '-0.02em', color: 'var(--type)' }}>
            MX${parseFloat(order.amount).toLocaleString('es-MX')}
          </span>
          <button className="kd-btn" onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} style={{
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
            background: editing ? 'var(--type)' : 'transparent', color: editing ? 'var(--bg)' : 'var(--type-soft)',
            border: '1px solid var(--line)', borderRadius: 'var(--radius)',
            padding: '8px 14px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
          }}>{saving ? '…' : editing ? O.save : O.edit}</button>
          {editing && (
            <button className="kd-btn" onClick={() => { setForm({ status: order.status, start_date: order.start_date ?? '', delivery_date: order.delivery_date ?? '', notes: order.notes ?? '' }); setEditing(false); }} style={{
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
              background: 'transparent', color: '#e05050', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius)', padding: '8px 12px', cursor: 'pointer',
            }}>{O.cancel}</button>
          )}
        </div>
      </div>
      {editing && (
        <div className="kd-edit-grid" style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <div>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 5 }}>{O.statusLabel}</label>
            <select className="kd-select" value={form.status} onChange={e => f('status', e.target.value)} style={inputStyle}>
              {Object.keys(STATUS_MAP).map(k => <option key={k} value={k}>{copy.portal.status[k]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 5 }}>{O.startDateLabel}</label>
            <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 5 }}>{O.deliveryDateLabel}</label>
            <input type="date" value={form.delivery_date} onChange={e => f('delivery_date', e.target.value)} style={inputStyle}/>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 5 }}>{O.internalNotes}</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--body)' }}/>
          </div>
        </div>
      )}
      {!editing && (order.start_date || order.delivery_date) && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {order.start_date && <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>{O.start}: <strong style={{ color: 'var(--type-soft)' }}>{formatDMY(order.start_date)}</strong></span>}
          {order.delivery_date && <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>{O.delivery}: <strong style={{ color: 'var(--type-soft)' }}>{formatDMY(order.delivery_date)}</strong></span>}
        </div>
      )}
    </div>
  );
}

// ── CLIENTE: tarjeta lista ────────────────────────────────────────────────────
function ClientCard({ order, copy }) {
  const O = copy.portal.orders;
  return (
    <div className="kd-card" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-2)', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--type)' }}>{order.service}</span>
            <StatusBadge status={order.status} copy={copy}/>
          </div>
          <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)' }}>{O.orderNum.replace('{n}', order.id)} · {formatDMY(order.created_at)}</span>
        </div>
        <span style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', flexShrink: 0 }}>MX${parseFloat(order.amount).toLocaleString('es-MX')}</span>
      </div>
      <ProgressBar status={order.status} copy={copy}/>
      {(order.start_date || order.delivery_date) && (
        <div style={{ marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {order.start_date && <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)' }}>{O.start}: <strong style={{ color: 'var(--type)' }}>{formatDMY(order.start_date)}</strong></span>}
          {order.delivery_date && <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)' }}>{O.delivery}: <strong style={{ color: 'var(--type)' }}>{formatDMY(order.delivery_date)}</strong></span>}
        </div>
      )}
      {order.notes && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', lineHeight: 1.5 }}>
          {order.notes}
        </div>
      )}
    </div>
  );
}

// ── KANBAN: tarjeta ───────────────────────────────────────────────────────────
function KanbanCard({ order, isAdmin, onSave, onPointerDown, dragging, justDropped, copy }) {
  const O = copy.portal.orders;
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    status: order.status, start_date: order.start_date ?? '',
    delivery_date: order.delivery_date ?? '', notes: order.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(order.id, form);
    setSaving(false);
    if (ok) setEditing(false);
  };
  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
    color: 'var(--type)', fontFamily: 'var(--body)', fontSize: 13, padding: '8px 10px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    WebkitAppearance: 'none', appearance: 'none',
  };
  return (
    <div
      className="kd-card"
      onPointerDown={isAdmin && !editing ? onPointerDown : undefined}
      style={{
        background: 'var(--bg)', border: `1px solid ${dragging ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: isAdmin && !editing ? 'grab' : 'default',
        WebkitUserSelect: 'none', userSelect: 'none',
        WebkitTouchCallout: 'none', touchAction: 'none',
        opacity: dragging ? 0.35 : 1,
        transform: dragging ? 'scale(0.97)' : 'scale(1)',
        transition: dragging
          ? 'opacity 0.18s ease, transform 0.18s ease'
          : 'opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
        animation: justDropped ? 'kanbanLand 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
      }}
    >
      {isAdmin && !editing && (
        <div style={{ marginBottom: -4 }}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="var(--line-2)" aria-hidden="true">
            <rect y="0" width="12" height="1.5" rx=".75"/><rect y="3.25" width="12" height="1.5" rx=".75"/><rect y="6.5" width="12" height="1.5" rx=".75"/>
          </svg>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type)', lineHeight: 1.3 }}>{order.service}</span>
        <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '-0.02em', color: 'var(--type)', flexShrink: 0 }}>MX${parseFloat(order.amount).toLocaleString('es-MX')}</span>
      </div>
      {isAdmin
        ? <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-muted)' }}>#{order.id} · {order.username}</span>
        : <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-muted)' }}>{O.orderNum.replace('{n}', order.id)}</span>
      }
      {order.delivery_date && (
        <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-muted)' }}>
          {O.delivery}: <strong style={{ color: 'var(--type-soft)' }}>{formatDMY(order.delivery_date)}</strong>
        </span>
      )}
      {order.notes && !editing && (
        <div style={{ padding: '6px 8px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-soft)', lineHeight: 1.4 }}>
          {order.notes.length > 60 ? order.notes.slice(0, 60) + '…' : order.notes}
        </div>
      )}
      {isAdmin && !editing && (
        <button
          className="kd-btn"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setEditing(true)}
          style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid var(--line)', color: 'var(--type-soft)',
            borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer', alignSelf: 'flex-end',
          }}
        >{O.edit}</button>
      )}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 4 }}>{O.statusLabel}</label>
            <select className="kd-select" value={form.status} onChange={e => f('status', e.target.value)} style={inputStyle}>
              {Object.keys(STATUS_MAP).map(k => <option key={k} value={k}>{copy.portal.status[k]}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 4 }}>{O.start}</label>
              <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 4 }}>{O.delivery}</label>
              <input type="date" value={form.delivery_date} onChange={e => f('delivery_date', e.target.value)} style={inputStyle}/>
            </div>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--ui)', fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-soft)', display: 'block', marginBottom: 4 }}>{O.notes}</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}/>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button className="kd-btn" onClick={() => setEditing(false)} style={{
              fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
              background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#e05050',
              borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer',
            }}>{O.cancel}</button>
            <button className="kd-btn" onClick={handleSave} disabled={saving} style={{
              fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
              background: 'var(--type)', border: 'none', color: 'var(--bg)',
              borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer',
            }}>{saving ? '…' : O.save}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VISTA KANBAN ───────────────────────────────────────────────────────────────
function KanbanView({ orders, isAdmin, onSave, copy }) {
  const O = copy.portal.orders;
  const [draggingId, setDraggingId]   = useState(null);
  const [ghostPos, setGhostPos]       = useState({ x: 0, y: 0 });
  const [ghostData, setGhostData]     = useState(null);
  const [overCol, setOverCol]         = useState(null);
  const [justDropped, setJustDropped] = useState(null);
  const colRefs    = useRef({});
  const dragOffset = useRef({ x: 0, y: 0 });
  const activeId   = useRef(null);

  const getColAtPoint = useCallback((x, y) => {
    for (const col of KANBAN_COLS) {
      const el = colRefs.current[col];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((orderId, e) => {
    if (!isAdmin) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activeId.current = orderId;
    setDraggingId(orderId);
    setGhostPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    setGhostData(orders.find(o => o.id === orderId) ?? null);
    setOverCol(null);
  }, [isAdmin, orders]);

  useEffect(() => {
    if (draggingId === null) return;
    const onMove = (e) => {
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      setGhostPos({ x: cx - dragOffset.current.x, y: cy - dragOffset.current.y });
      setOverCol(getColAtPoint(cx, cy));
    };
    const onUp = async (e) => {
      const cx = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0;
      const target = getColAtPoint(cx, cy);
      const id     = activeId.current;
      const order  = orders.find(o => o.id === id);
      setDraggingId(null); setGhostData(null); setOverCol(null); activeId.current = null;
      if (target && order && order.status !== target) {
        await onSave(id, { status: target, start_date: order.start_date ?? '', delivery_date: order.delivery_date ?? '', notes: order.notes ?? '' });
        setJustDropped(id);
        setTimeout(() => setJustDropped(null), 500);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, [draggingId, orders, onSave, getColAtPoint]);

  const isDragging = draggingId !== null;

  return (
    <>
      {isDragging && ghostData && (
        <div aria-hidden="true" style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          left: ghostPos.x, top: ghostPos.y, width: 220,
          transform: 'rotate(2.5deg) scale(1.05)',
          background: 'var(--bg)', border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', gap: 8,
          WebkitUserSelect: 'none', userSelect: 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type)' }}>{ghostData.service}</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--type)', flexShrink: 0 }}>MX${parseFloat(ghostData.amount).toLocaleString('es-MX')}</span>
          </div>
          <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--type-muted)' }}>
            #{ghostData.id}{ghostData.username ? ` · ${ghostData.username}` : ''}
          </span>
          <StatusBadge status={ghostData.status} copy={copy}/>
        </div>
      )}

      <div className="kd-kanban-grid" style={{ cursor: isDragging ? 'grabbing' : 'auto' }}>
        {KANBAN_COLS.map(col => {
          const s         = STATUS_MAP[col];
          const colOrders = orders.filter(o => o.status === col);
          const highlight = overCol === col && isDragging && ghostData?.status !== col;
          return (
            <div key={col} className="kd-kanban-col" ref={el => colRefs.current[col] = el} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                background: highlight ? s.color + '28' : s.bg,
                border: `1px solid ${highlight ? s.color + 'aa' : s.border}`,
                borderBottom: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: s.color }}>{copy.portal.status[col]}</span>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 9, color: s.color, opacity: 0.7 }}>{colOrders.length}</span>
              </div>
              <div style={{
                flex: 1, minHeight: 120, padding: '10px', gap: 10,
                display: 'flex', flexDirection: 'column',
                background: highlight ? s.color + '0a' : 'var(--bg-2)',
                border: `1px solid ${highlight ? s.color + '66' : s.border}`,
                borderTop: 'none',
                borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                {highlight && (
                  <div style={{
                    border: `2px dashed ${s.color}66`, borderRadius: 'var(--radius-lg)',
                    minHeight: 68, background: s.color + '08',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em',
                    textTransform: 'uppercase', color: s.color,
                    animation: 'kanbanPlaceholder 0.18s ease forwards',
                    transformOrigin: 'top',
                  }}>{O.dropHere}</div>
                )}
                {colOrders.length === 0 && !highlight
                  ? <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>{O.emptyColumn}</div>
                  : colOrders.map(o => (
                    <KanbanCard key={o.id} order={o} isAdmin={isAdmin} onSave={onSave} copy={copy}
                      dragging={draggingId === o.id} justDropped={justDropped === o.id}
                      onPointerDown={e => handlePointerDown(o.id, e)}/>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── VISTA CALENDARIO ──────────────────────────────────────────────────────────
function CalendarView({ orders, copy }) {
  const O = copy.portal.orders;
  const isMobile = useIsMobile();
  const today    = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const firstDay   = new Date(year, month, 1);
  const lastDay    = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const byDate = {};
  orders.forEach(o => {
    [[o.delivery_date, 'delivery'], [o.start_date, 'start']].forEach(([d, type]) => {
      if (!d) return;
      const key = d.slice(0, 10);
      if (!byDate[key]) byDate[key] = [];
      if (!byDate[key].find(x => x.id === o.id && x._type === type)) byDate[key].push({ ...o, _type: type });
    });
  });

  const selectedKey    = selected ? `${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}` : null;
  const selectedOrders = selectedKey ? (byDate[selectedKey] ?? []) : [];
  const todayStr       = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Nav mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="kd-btn" onClick={prev} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius)', color: 'var(--type-soft)', padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 14, minWidth: 40 }}>←</button>
        <span style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 16 : 18, letterSpacing: '-0.02em', color: 'var(--type)', textAlign: 'center' }}>
          {O.months[month]} {year}
        </span>
        <button className="kd-btn" onClick={next} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius)', color: 'var(--type-soft)', padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 14, minWidth: 40 }}>→</button>
      </div>

      {/* Grid */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-3)', borderBottom: '1px solid var(--line)' }}>
          {O.days.map(d => (
            <div key={d} style={{ padding: isMobile ? '6px 2px' : '8px 4px', textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>
              {isMobile ? d[0] : d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum    = i - startOffset + 1;
            const valid     = dayNum >= 1 && dayNum <= lastDay.getDate();
            const dateKey   = valid ? `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}` : null;
            const dayOrders = dateKey ? (byDate[dateKey] ?? []) : [];
            const isToday   = dateKey === todayStr;
            const isSelected = valid && selected === dayNum;
            const col = i % 7, row = Math.floor(i / 7), totalRows = totalCells / 7;
            return (
              <div
                key={i}
                className="kd-cal-cell"
                onClick={() => valid && dayOrders.length > 0 && setSelected(isSelected ? null : dayNum)}
                style={{
                  background: isSelected ? 'var(--bg-3)' : 'var(--bg-2)',
                  borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                  borderBottom: row < totalRows - 1 ? '1px solid var(--line)' : 'none',
                  cursor: valid && dayOrders.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {valid && (
                  <>
                    <div style={{
                      fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.06em',
                      color: isToday ? 'var(--bg)' : 'var(--type-muted)',
                      background: isToday ? 'var(--type)' : 'transparent',
                      width: 20, height: 20, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 3,
                    }}>{dayNum}</div>
                    {/* Chips de texto (desktop) / dots (mobile via CSS) */}
                    {!isMobile && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayOrders.slice(0, 2).map((o, idx) => {
                          const s = STATUS_MAP[o.status];
                          return (
                            <div key={`${o.id}-${idx}`} className="kd-cal-chip" style={{
                              padding: '2px 4px', borderRadius: 3,
                              background: s.bg, border: `1px solid ${s.border}`,
                              fontFamily: 'var(--ui)', fontSize: 8, color: s.color,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {o._type === 'delivery' ? '↓' : '→'} {o.service}
                            </div>
                          );
                        })}
                        {dayOrders.length > 2 && (
                          <div style={{ fontFamily: 'var(--ui)', fontSize: 8, color: 'var(--type-muted)', paddingLeft: 2 }}>
                            +{dayOrders.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Dots en mobile */}
                    {isMobile && dayOrders.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                        {dayOrders.slice(0, 3).map((o, idx) => {
                          const s = STATUS_MAP[o.status];
                          return <div key={idx} style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }}/>;
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}><strong style={{ color: 'var(--type-soft)' }}>↓</strong> {O.delivery}</span>
        <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}><strong style={{ color: 'var(--type-soft)' }}>→</strong> {O.start}</span>
      </div>

      {/* Panel del día seleccionado */}
      {selected && selectedOrders.length > 0 && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'var(--bg-3)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
              {O.dayOfMonth.replace('{d}', selected).replace('{month}', O.months[month])}
            </span>
            <button className="kd-btn" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--type-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedOrders.map((o, idx) => {
              const s = STATUS_MAP[o.status];
              return (
                <div key={`${o.id}-${idx}`} style={{
                  padding: '14px 18px',
                  borderBottom: idx < selectedOrders.length - 1 ? '1px solid var(--line)' : 'none',
                  background: 'var(--bg-2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type)' }}>{o.service}</span>
                      <StatusBadge status={o.status} copy={copy}/>
                      <span style={{ fontFamily: 'var(--body)', fontSize: 10, color: s.color }}>{o._type === 'delivery' ? O.delivery : O.start}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)' }}>#{o.id}{o.username ? ` · ${o.username}` : ''}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.02em', color: 'var(--type)' }}>
                    MX${parseFloat(o.amount).toLocaleString('es-MX')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FILTER BAR ────────────────────────────────────────────────────────────────
function FilterBar({ search, onSearch, statusFilter, onStatus, serviceFilter, onService, sort, onSort, total, filtered, isAdmin, onClear, copy }) {
  const O = copy.portal.orders;
  const isMobile = useIsMobile();
  const chipStyle = (active) => ({
    fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
    padding: '6px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid',
    background: active ? 'var(--type)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--type-soft)',
    borderColor: active ? 'var(--type)' : 'var(--line)',
    transition: 'all 0.18s', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  });
  const selectStyle = {
    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.1em',
    background: 'var(--bg-2)', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', color: 'var(--type-soft)',
    padding: '8px 26px 8px 10px', cursor: 'pointer', outline: 'none',
    width: isMobile ? '100%' : 'auto',
  };
  const hasFilters = search || statusFilter !== 'todos' || serviceFilter !== 'todos' || sort !== 'newest';

  return (
    <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Búsqueda */}
      <div style={{ position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--type-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={search}
          placeholder={isAdmin ? O.searchAdminPlaceholder : O.searchPlaceholder}
          onChange={e => onSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 36px 9px 30px',
            background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)', outline: 'none',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
        {search && (
          <button className="kd-btn" onClick={() => onSearch('')} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--type-muted)', padding: 4, lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      {/* Selects (sort + service) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <select className="kd-select" value={sort} onChange={e => onSort(e.target.value)} style={{ ...selectStyle, flex: isMobile ? '1 1 calc(50% - 4px)' : 'none' }}>
          <option value="newest">{O.sortNewest}</option>
          <option value="oldest">{O.sortOldest}</option>
          <option value="amount_desc">{O.sortAmountDesc}</option>
          <option value="amount_asc">{O.sortAmountAsc}</option>
        </select>
        {isAdmin && (
          <select className="kd-select" value={serviceFilter} onChange={e => onService(e.target.value)} style={{ ...selectStyle, flex: isMobile ? '1 1 calc(50% - 4px)' : 'none' }}>
            <option value="todos">{O.allServices}</option>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Chips de estatus + contador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {['todos', 'pendiente', 'en_proceso', 'completado', 'cancelado'].map(s => (
          <button key={s} className="kd-btn" onClick={() => onStatus(s)} style={chipStyle(statusFilter === s)}>
            {s === 'todos' ? O.all : copy.portal.status[s]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', flexShrink: 0 }}>
          {filtered}/{total}
        </span>
        {hasFilters && (
          <button className="kd-btn" onClick={onClear} style={{ ...chipStyle(false), color: '#ca8a04', borderColor: 'rgba(234,179,8,0.4)' }}>{O.clear}</button>
        )}
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function OrdersPage({ user, onNavigate, onLogout, copy, theme, onThemeToggle }) {
  const O = copy.portal.orders;
  const isMobile = useIsMobile();
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState('');
  const [saveError, setSaveError]         = useState('');
  const [view, setView]                   = useState('list');
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('todos');
  const [serviceFilter, setServiceFilter] = useState('todos');
  const [sort, setSort]                   = useState('newest');
  const isAdmin = user?.role === 'administrador';

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/orders.php`, { headers: { Authorization: `Bearer ${token}` } });
      const d     = await res.json();
      setOrders(d.orders ?? []);
      setError('');
    } catch {
      setError(O.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [O.loadError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const applyFilters = (list) => list.filter(o => {
    if (statusFilter !== 'todos' && o.status !== statusFilter) return false;
    if (isAdmin && serviceFilter !== 'todos' && o.service !== serviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const h = isAdmin
        ? `${o.service} ${o.id} ${o.user_name} ${o.username} ${o.user_email}`.toLowerCase()
        : `${o.service} ${o.id}`.toLowerCase();
      if (!h.includes(q)) return false;
    }
    return true;
  });

  const filteredOrders = applyFilters(orders).sort((a, b) => {
    if (sort === 'oldest')      return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'amount_desc') return parseFloat(b.amount)   - parseFloat(a.amount);
    if (sort === 'amount_asc')  return parseFloat(a.amount)   - parseFloat(b.amount);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const kanbanCalOrders = applyFilters(orders);
  const clearFilters    = () => { setSearch(''); setStatusFilter('todos'); setServiceFilter('todos'); setSort('newest'); };

  const handleSave = async (id, form) => {
    const token = localStorage.getItem('token');
    setSaveError('');
    try {
      const res  = await fetch(`${API}/orders.php?id=${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.order) {
        setOrders(prev => prev.map(o => o.id === id ? data.order : o));
        return true;
      }
      setSaveError(data.error ?? O.saveError);
      return false;
    } catch {
      setSaveError(O.connError);
      return false;
    }
  };

  const viewBtnStyle = (v) => ({
    display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6,
    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
    background: view === v ? 'var(--bg-3)' : 'transparent',
    border: view === v ? '1px solid var(--line)' : '1px solid transparent',
    borderRadius: 'var(--radius)', color: view === v ? 'var(--type)' : 'var(--type-muted)',
    padding: isMobile ? '8px' : '6px 10px', cursor: 'pointer', transition: 'all 0.18s',
    WebkitTapHighlightColor: 'transparent',
  });

  const maxW = view === 'kanban' ? 1100 : view === 'calendar' ? 860 : (isAdmin ? 900 : 760);

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <div className="kd-page-body" style={{ maxWidth: maxW, width: '100%', margin: '0 auto', transition: 'max-width 0.3s' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 6px' }}>
                {O.adminPanel}
              </p>
            )}
            <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
              {isAdmin ? O.titleAdmin : O.title}
            </h1>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '6px 0 0' }}>
                {(orders.length === 1 ? O.totalOne : O.totalMany).replace('{n}', orders.length)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {/* View switcher */}
            {!loading && !error && orders.length > 0 && (
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 4, flexShrink: 0 }}>
                {[
                  { id: 'list',     label: O.viewList     },
                  { id: 'kanban',   label: O.viewKanban   },
                  { id: 'calendar', label: O.viewCalendar },
                ].map(v => (
                  <button key={v.id} className="kd-btn" onClick={() => setView(v.id)} style={viewBtnStyle(v.id)} title={v.label} aria-label={v.label} aria-pressed={view === v.id}>
                    <ViewIcon type={v.id} active={view === v.id}/>
                    <span className="kd-view-label">{v.label}</span>
                  </button>
                ))}
              </div>
            )}
            <RefreshButton onClick={() => fetchOrders(true)} loading={refreshing} />
          </div>
        </div>

        {loading && (
          <div style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-muted)', textAlign: 'center', padding: '60px 0' }}>
            {O.loading}
          </div>
        )}
        {error && (
          <div role="alert" style={{ padding: '14px 18px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontFamily: 'var(--body)', fontSize: 13 }}>
            {error}
          </div>
        )}
        {saveError && (
          <div role="alert" style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontFamily: 'var(--body)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>{saveError}</span>
            <button onClick={() => setSaveError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--type)', margin: '0 0 8px' }}>{O.emptyTitle}</p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: '0 0 24px' }}>
              {isAdmin ? O.emptyAdmin : O.emptyClient}
            </p>
            {!isAdmin && (
              <button className="kd-btn" onClick={() => onNavigate?.('/comprar')} style={{
                background: 'var(--type)', color: 'var(--bg)', border: 0,
                padding: '11px 22px', borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer',
              }}>{O.viewServices}</button>
            )}
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            {/* Filtros (lista + kanban) */}
            {view !== 'calendar' && (
              <FilterBar
                search={search} onSearch={setSearch}
                statusFilter={statusFilter} onStatus={setStatusFilter}
                serviceFilter={serviceFilter} onService={setServiceFilter}
                sort={sort} onSort={setSort}
                total={orders.length} filtered={view === 'list' ? filteredOrders.length : kanbanCalOrders.length}
                isAdmin={isAdmin} onClear={clearFilters} copy={copy}
              />
            )}

            {/* Filtros calendario */}
            {view === 'calendar' && (
              <div className="kd-cal-filters">
                <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
                  <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--type-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input type="search" value={search} placeholder={O.searchShort} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 32px 8px 30px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)', outline: 'none', WebkitAppearance: 'none' }}/>
                  {search && <button className="kd-btn" onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--type-muted)', padding: 4 }}>✕</button>}
                </div>
                {Object.entries(STATUS_MAP).map(([k, s]) => (
                  <button key={k} className="kd-btn" onClick={() => setStatusFilter(statusFilter === k ? 'todos' : k)} style={{
                    fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
                    padding: '6px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                    background: statusFilter === k ? s.bg : 'transparent',
                    color: statusFilter === k ? s.color : 'var(--type-muted)',
                    border: `1px solid ${statusFilter === k ? s.border : 'var(--line)'}`,
                    transition: 'all 0.18s', flexShrink: 0,
                  }}>{copy.portal.status[k]}</button>
                ))}
              </div>
            )}

            {/* ── VISTA LISTA ── */}
            {view === 'list' && (
              filteredOrders.length === 0 ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--type)', margin: '0 0 8px' }}>{O.noResults}</p>
                  <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '0 0 20px' }}>{O.noResultsDesc}</p>
                  <button className="kd-btn" onClick={clearFilters} style={{
                    background: 'transparent', border: '1px solid var(--line)', color: 'var(--type-soft)',
                    padding: '9px 18px', borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>{O.clearFilters}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isAdmin
                    ? filteredOrders.map(o => <AdminRow key={o.id} order={o} onSave={handleSave} copy={copy}/>)
                    : filteredOrders.map(o => <ClientCard key={o.id} order={o} copy={copy}/>)
                  }
                </div>
              )
            )}

            {/* ── VISTA KANBAN ── */}
            {view === 'kanban' && (
              <>
                {isMobile && (
                  <p style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', marginBottom: 10, marginTop: -8 }}>
                    {O.swipeHint}
                  </p>
                )}
                <KanbanView orders={kanbanCalOrders} isAdmin={isAdmin} onSave={handleSave} copy={copy}/>
              </>
            )}

            {/* ── VISTA CALENDARIO ── */}
            {view === 'calendar' && <CalendarView orders={kanbanCalOrders} copy={copy}/>}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
