import { useState, useEffect, useCallback, useRef } from 'react';
import PortalLayout from './PortalLayout';
import { API_BASE_URL } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: '7daysAgo',  label: '7 días'  },
  { value: '28daysAgo', label: '28 días' },
  { value: '90daysAgo', label: '90 días' },
];

const CHART_COLORS = ['#5170ff', '#63C44D', '#FFDE59', '#ff6b6b', '#a78bfa', '#fb923c'];

const CHANNEL_ES = {
  'Organic Search':  'Búsqueda orgánica',
  'Direct':          'Directo',
  'Referral':        'Referencia',
  'Organic Social':  'Redes sociales',
  'Paid Search':     'Búsqueda pagada',
  'Email':           'Email',
  'Unassigned':      'Sin asignar',
  '(other)':         'Otros',
};

const SERVICE_ACCENT = {
  'Landing Page':  '#63C44D',
  'Sitio Web':     '#5170ff',
  'Tienda Online': '#FFDE59',
};

// ── Utilidades ────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}

function trendPct(current, previous) {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

// ── Tarjeta de proyecto ───────────────────────────────────────────────────────

function ProjectCard({ project, label, isConfigured, onView, onSaveLabel }) {
  const [editing,   setEditing]   = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [hovered,   setHovered]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditValue(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = async () => {
    const trimmed = editValue.trim();
    setEditing(false);
    if (!trimmed || trimmed === label) return;
    setSaving(true);
    await onSaveLabel(trimmed);
    setSaving(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

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
      {/* Barra de color superior */}
      <div style={{ height: 4, background: project.accent, flexShrink: 0 }} />

      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Tipo de servicio + estado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.22em',
            textTransform: 'uppercase', color: 'var(--type-muted)',
          }}>
            {project.serviceType}
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: isConfigured ? '#16a34a' : 'var(--type-muted)',
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: isConfigured ? '#16a34a' : 'var(--line-2)',
            }} />
            {isConfigured ? 'Configurado' : 'En configuración'}
          </span>
        </div>

        {/* Etiqueta editable */}
        <div style={{ flex: 1, minHeight: 52 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              maxLength={80}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em',
                color: 'var(--type)', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${project.accent}`,
                outline: 'none', padding: '2px 0',
              }}
            />
          ) : (
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'text' }}
              onClick={startEdit}
            >
              <span style={{
                fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em',
                color: saving ? 'var(--type-muted)' : 'var(--type)',
                lineHeight: 1.15, flex: 1, wordBreak: 'break-word',
                transition: 'color .15s',
              }}>
                {label}
              </span>
              {/* Icono editar */}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="var(--type-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  flexShrink: 0, marginTop: 5,
                  opacity: hovered && !saving ? 0.5 : 0,
                  transition: 'opacity .15s',
                }}
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* Botón ver analíticas */}
        <button
          onClick={() => onView(project)}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
            color: 'var(--type-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color .2s, color .2s, background .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = project.accent;
            e.currentTarget.style.color = 'var(--type)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--type-soft)';
          }}
        >
          <span>Ver analíticas</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Gráfico de área (SVG) ─────────────────────────────────────────────────────

function AreaChart({ data, metric = 'sessions' }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type-muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
        Sin datos suficientes
      </span>
    </div>
  );

  const vals = data.map(d => d[metric]);
  const max  = Math.max(...vals, 1);
  const W = 500, H = 100, padB = 20, h = H - padB;

  const px = i => (i / (data.length - 1)) * W;
  const py = v => h - (v / max) * h + 2;
  const pts = vals.map((v, i) => [px(i), py(v)]);

  let line = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1][0] + pts[i][0]) / 2;
    line += ` C ${cpx},${pts[i - 1][1]} ${cpx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  const area = line + ` L ${W},${h} L 0,${h} Z`;

  const step   = Math.max(1, Math.floor(data.length / 5));
  const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 130, display: 'block', overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#5170ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5170ff" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#5170ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => vals[i] === max && <circle key={i} cx={x} cy={y} r="3.5" fill="#5170ff" />)}
      {labels.map((d, i) => {
        const idx = data.indexOf(d);
        return (
          <text key={i} x={px(idx)} y={H - 3} textAnchor="middle" style={{ fontFamily: 'sans-serif', fontSize: 9, fill: 'var(--type-muted, #666)' }}>
            {fmtDate(d.date)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Gráfico de dona (SVG) ─────────────────────────────────────────────────────

function DonutChart({ sources, total }) {
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r, gap = 2;

  const pcts = sources.map(s => total > 0 ? s.sessions / total : 0);
  const segs = sources.map((s, i) => ({
    ...s,
    pct:    pcts[i],
    dash:   Math.max(0, pcts[i] * circ - gap),
    offset: pcts.slice(0, i).reduce((sum, p) => sum + p * circ, 0),
    color:  CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', flexShrink: 0, width: 100, height: 100 }}>
        <svg viewBox="0 0 100 100" style={{ width: 100, height: 100 }}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {sources.length === 0
              ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="16" />
              : segs.map((s, i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16"
                    strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset}
                    style={{ transition: 'stroke-dasharray .4s ease' }} />
                ))
            }
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--type)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(total)}</span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 9, color: 'var(--type-muted)', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>sesiones</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segs.slice(0, 5).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CHANNEL_ES[s.channel] || s.channel}</span>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type)', flexShrink: 0 }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Realtime Card ─────────────────────────────────────────────────────────────

function RealtimeCard({ realtime, isMobile }) {
  const { activeUsers, pages = [], events = [] } = realtime;
  const maxUsers  = pages[0]?.users  || 1;
  const maxEvents = events[0]?.count || 1;

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--line)',
        background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'kd-pulse 2s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', flex: 1 }}>
          Ahora mismo
        </span>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', letterSpacing: '.06em' }}>
          Últimos 30 min
        </span>
      </div>

      <div style={{
        background: 'var(--bg-2)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
        gap: 0,
      }}>
        {/* Usuarios activos */}
        <div style={{ padding: '20px 24px', borderRight: isMobile ? 'none' : '1px solid var(--line)', borderBottom: isMobile ? '1px solid var(--line)' : 'none' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', marginBottom: 6 }}>
            Usuarios activos
          </span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 42, letterSpacing: '-0.03em', color: activeUsers > 0 ? '#16a34a' : 'var(--type)', lineHeight: 1 }}>
            {activeUsers}
          </span>
          <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', display: 'block', marginTop: 4 }}>
            {activeUsers === 1 ? 'persona en el sitio' : 'personas en el sitio'}
          </span>
        </div>

        {/* Páginas activas */}
        <div style={{ padding: '20px 0', borderRight: isMobile ? 'none' : '1px solid var(--line)', borderBottom: isMobile ? '1px solid var(--line)' : 'none' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', padding: '0 24px', marginBottom: 10 }}>
            Páginas activas
          </span>
          {pages.length === 0
            ? <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', padding: '0 24px' }}>Sin actividad</span>
            : pages.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 24px' }}>
                  <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.path}>
                    {p.path}
                  </span>
                  <div style={{ width: 40, height: 2, background: 'var(--line)', borderRadius: 1, flexShrink: 0 }}>
                    <div style={{ width: `${(p.users / maxUsers) * 100}%`, height: '100%', background: '#16a34a', borderRadius: 1 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type)', width: 16, textAlign: 'right', flexShrink: 0 }}>{p.users}</span>
                </div>
              ))
          }
        </div>

        {/* Eventos recientes */}
        <div style={{ padding: '20px 0' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', padding: '0 24px', marginBottom: 10 }}>
            Eventos recientes
          </span>
          {events.length === 0
            ? <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', padding: '0 24px' }}>Sin eventos</span>
            : events.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 24px' }}>
                  <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.name}>
                    {e.name}
                  </span>
                  <div style={{ width: 40, height: 2, background: 'var(--line)', borderRadius: 1, flexShrink: 0 }}>
                    <div style={{ width: `${(e.count / maxEvents) * 100}%`, height: '100%', background: '#5170ff', borderRadius: 1 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type)', width: 16, textAlign: 'right', flexShrink: 0 }}>{e.count}</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, previous, suffix = '', format = fmt }) {
  const pct = trendPct(value, previous);
  const up  = pct !== null && pct >= 0;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '-0.03em', color: 'var(--type)', lineHeight: 1.1 }}>{format(value)}{suffix}</span>
      {pct !== null
        ? <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: up ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>{up ? '↑' : '↓'} {Math.abs(pct)}% vs período anterior</span>
        : <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type-muted)' }}>Sin período anterior</span>
      }
    </div>
  );
}

// ── Fila con barra ────────────────────────────────────────────────────────────

function BarRow({ label, value, max, badge, color = 'var(--type-soft)' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
      <div style={{ width: 72, height: 3, background: 'var(--line)', borderRadius: 2, flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--type)', width: 44, textAlign: 'right', flexShrink: 0 }}>{fmt(value)}</span>
      {badge != null && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', width: 34, textAlign: 'right', flexShrink: 0 }}>{badge}</span>}
    </div>
  );
}

// ── Card contenedor ───────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>{title}</span>
      </div>
      <div style={{ background: 'var(--bg-2)' }}>{children}</div>
    </div>
  );
}

function Empty({ text = 'Sin datos para este período' }) {
  return (
    <div style={{ padding: '32px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)' }}>{text}</span>
    </div>
  );
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function Skeleton({ isMobile }) {
  const box = (h = 80) => (
    <div style={{ height: h, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', animation: 'kd-pulse 1.4s ease-in-out infinite' }} />
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12 }}>{[1,2,3,4].map(i => <div key={i}>{box(88)}</div>)}</div>
      {box(170)}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>{[1,2].map(i => <div key={i}>{box(220)}</div>)}</div>
      {box(200)}
      {box(200)}
    </div>
  );
}

// ── Modal de exportación ──────────────────────────────────────────────────────

function ExportModal({ defaultPeriod, onClose, onExport, loading }) {
  const days     = parseInt(defaultPeriod) || 7;
  const todayStr = new Date().toISOString().slice(0, 10);
  const defStart = (() => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); })();

  const [start,  setStart]  = useState(defStart);
  const [end,    setEnd]    = useState(todayStr);
  const [format, setFormat] = useState('xls');

  const valid = start && end && start <= end;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)',
    background: 'var(--bg-2)', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none',
    colorScheme: 'light dark',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '28px 28px 24px', width: '100%', maxWidth: 400 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 20px' }}>
          Exportar analíticas
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Desde', value: start, onChange: setStart, max: end },
            { label: 'Hasta', value: end,   onChange: setEnd,   min: start, max: todayStr },
          ].map(({ label, value, onChange, min, max }) => (
            <div key={label}>
              <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', marginBottom: 6 }}>
                {label}
              </label>
              <input type="date" value={value} min={min} max={max} onChange={e => onChange(e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', marginBottom: 8 }}>
            Formato
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ value: 'xls', label: 'Excel (.csv)' }, { value: 'pdf', label: 'PDF' }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                style={{
                  flex: 1, padding: '9px 0',
                  border: `1px solid ${format === opt.value ? 'var(--type)' : 'var(--line)'}`,
                  borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                  background: format === opt.value ? 'var(--type)' : 'transparent',
                  color:      format === opt.value ? 'var(--bg)'   : 'var(--type-soft)',
                  transition: 'all .15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
              padding: '10px 20px', borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--type-soft)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => valid && !loading && onExport({ startDate: start, endDate: end, format })}
            disabled={!valid || loading}
            style={{
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
              padding: '10px 20px', borderRadius: 'var(--radius-pill)', border: 0,
              background: valid && !loading ? 'var(--type)' : 'var(--line)',
              color:      valid && !loading ? 'var(--bg)'   : 'var(--type-muted)',
              cursor:     valid && !loading ? 'pointer'     : 'not-allowed',
              transition: 'all .15s',
            }}
          >
            {loading ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estado no configurado ─────────────────────────────────────────────────────

function NotConfigured() {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', padding: '14px 20px' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>Configuración requerida</span>
      </div>
      <div style={{ background: 'var(--bg-2)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 6px' }}>Conecta GA4 Data API</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
            Para visualizar las estadísticas necesitas configurar una cuenta de servicio de Google con acceso a tu propiedad GA4.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Activa la Google Analytics Data API en console.cloud.google.com',
            'Crea una Cuenta de servicio y descarga el JSON de credenciales',
            'En GA4 → Administrar → Administración de acceso → agrega el email de la cuenta de servicio como Lector',
            'Coloca el JSON en backend/ga4_credentials.json (ya está en .gitignore)',
            'Agrega GA4_PROPERTY_ID y GA4_CREDENTIALS_PATH al backend/.env',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-soft)' }}>{i + 1}</span>
              </div>
              <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', lineHeight: 1.55 }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--radius)', padding: '12px 16px', fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--type-soft)', lineHeight: 2 }}>
          GA4_PROPERTY_ID=<span style={{ color: 'var(--type)' }}>315123900234</span><br />
          GA4_CREDENTIALS_PATH=<span style={{ color: 'var(--type)' }}>ga4_credentials.json</span>
        </div>
      </div>
    </div>
  );
}

// ── Estado pendiente (proyecto del cliente) ───────────────────────────────────

function Pending({ projectLabel }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', padding: '14px 20px' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>En implementación</span>
      </div>
      <div style={{ background: 'var(--bg-2)', padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--line-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 8px' }}>Estamos configurando tus analíticas</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.7, maxWidth: 400 }}>
            El equipo de Kodeo está integrando las analíticas para tu <strong style={{ color: 'var(--type)', fontWeight: 500 }}>{projectLabel}</strong>. Podrás ver los datos aquí una vez que esté listo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AnalyticsPage({ user, onNavigate, onLogout, copy, theme, onThemeToggle }) {
  // Vista: 'grid' = mosaico de proyectos | 'detail' = dashboard de analíticas
  const [view,          setView]         = useState('grid');
  const [projects,      setProjects]     = useState([]);
  const [meta,          setMeta]         = useState({ labels: {}, configured: {} });
  const [loadingMeta,   setLoadingMeta]  = useState(() => !!localStorage.getItem('token'));
  const [selectedId,    setSelectedId]   = useState(null);
  const [period,        setPeriod]       = useState('7daysAgo');
  const [analyticsData, setAnalytics]    = useState(null);
  const [loading,       setLoading]      = useState(false);
  const [refreshing,    setRefreshing]   = useState(false);
  const [error,         setError]        = useState(null);
  const [lastUpdate,    setLastUpdate]   = useState(null);
  const [exportOpen,    setExportOpen]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { isMobile } = useBreakpoint();

  // Cargar proyectos + etiquetas al montar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    Promise.all([
      fetch(`${API_BASE_URL}/orders.php`,                { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/analytics.php?action=meta`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([ordersJson, metaJson]) => {
        // orders.php ya filtra por user_id en el backend para clientes;
        // para admins devuelve todos, por eso usamos user.id para quedarnos
        // solo con los pedidos del propio usuario autenticado.
        const userId = String(user?.id ?? '');
        const userOrders = (ordersJson.orders ?? []).filter(
          o => o.status !== 'cancelado' && (!userId || String(o.user_id) === userId),
        );
        const orderCards = userOrders.map(o => ({
          id:          String(o.id),
          serviceType: o.service,
          accent:      SERVICE_ACCENT[o.service] ?? '#5170ff',
        }));

        const isAdmin = user?.role === 'administrador';
        const base = isAdmin ? [{ id: 'kodeo', serviceType: 'Plataforma propia', accent: '#5170ff' }] : [];
        setProjects([...base, ...orderCards]);
        setMeta({ labels: metaJson.labels ?? {}, configured: metaJson.configured ?? {} });
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, [user]);

  // Cargar datos de analíticas
  const loadAnalytics = useCallback(async (proj, p, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setAnalytics(null); }
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/analytics.php?period=${p}&project=${proj}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar analíticas');
      setAnalytics(json);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'detail' && selectedId) loadAnalytics(selectedId, period);
  }, [period, view, selectedId, loadAnalytics]);

  // Guardar etiqueta de proyecto
  const saveLabel = async (id, label) => {
    const token = localStorage.getItem('token');
    const res   = await fetch(`${API_BASE_URL}/analytics.php?order_id=${id}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ label }),
    });
    if (res.ok) {
      setMeta(prev => ({ ...prev, labels: { ...prev.labels, [id]: label } }));
    }
  };

  // Exportar analíticas
  const generateCSV = (data, label, startDate, endDate) => {
    const cur = data.overview.current;
    const prv = data.overview.previous;
    const rows = [
      [`ANALITICAS — ${label}`],
      ['Periodo', `${startDate} — ${endDate}`],
      ['Exportado', new Date().toLocaleString('es-MX')],
      [],
      ['RESUMEN'],
      ['Metrica', 'Valor', 'Periodo anterior'],
      ['Usuarios activos', cur.users,      prv.users],
      ['Sesiones',         cur.sessions,   prv.sessions],
      ['Vistas de pagina', cur.pageViews,  prv.pageViews],
      ['Tasa de rebote %', cur.bounceRate, prv.bounceRate],
      [],
      ['PAGINAS MAS VISITADAS'],
      ['Pagina', 'Vistas'],
      ...data.pages.map(p => [p.path, p.views]),
      [],
      ['FUENTES DE TRAFICO'],
      ['Canal', 'Sesiones'],
      ...data.sources.map(s => [CHANNEL_ES[s.channel] || s.channel, s.sessions]),
      [],
      ['EVENTOS'],
      ['Evento', 'Conteo'],
      ...data.events.map(e => [e.name, e.count]),
      [],
      ['DATOS DIARIOS'],
      ['Fecha', 'Usuarios', 'Sesiones'],
      ...data.daily.map(d => [d.date, d.users, d.sessions]),
    ];
    const esc = c => { const s = String(c ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `analiticas-${label.toLowerCase().replace(/\s+/g, '-')}-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = (data, label, startDate, endDate) => {
    const cur = data.overview.current;
    const prv = data.overview.previous;
    const now = new Date().toLocaleString('es-MX');
    const th  = `padding:8px 12px;background:#f5f5f5;border:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666;text-align:left;`;
    const td  = `padding:8px 12px;border:1px solid #ddd;font-size:12px;color:#333;`;
    const tbl = (headers, rows) =>
      `<table style="border-collapse:collapse;width:100%;margin-bottom:28px">
        <thead><tr>${headers.map(h => `<th style="${th}">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td style="${td}">${c ?? 0}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Analiticas — ${label}</title>
      <style>body{font-family:sans-serif;color:#333;margin:40px;font-size:13px}h1{font-size:22px;margin:0 0 4px}
      h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:24px 0 8px}
      .meta{color:#666;font-size:12px;margin-bottom:28px}@media print{body{margin:20px}}</style>
    </head><body>
      <h1>Analiticas — ${label}</h1>
      <p class="meta">Periodo: ${startDate} — ${endDate} &nbsp;·&nbsp; Exportado: ${now}</p>
      <h2>Resumen</h2>
      ${tbl(['Metrica','Valor','Periodo anterior'],[
        ['Usuarios activos',cur.users,prv.users],
        ['Sesiones',cur.sessions,prv.sessions],
        ['Vistas de pagina',cur.pageViews,prv.pageViews],
        ['Tasa de rebote',cur.bounceRate+'%',prv.bounceRate+'%'],
      ])}
      <h2>Paginas mas visitadas</h2>
      ${tbl(['Pagina','Vistas'],data.pages.map(p=>[p.path,p.views]))}
      <h2>Fuentes de trafico</h2>
      ${tbl(['Canal','Sesiones'],data.sources.map(s=>[CHANNEL_ES[s.channel]||s.channel,s.sessions]))}
      <h2>Eventos</h2>
      ${tbl(['Evento','Conteo'],data.events.map(e=>[e.name,e.count]))}
      <h2>Datos diarios</h2>
      ${tbl(['Fecha','Usuarios','Sesiones'],data.daily.map(d=>[d.date,d.users,d.sessions]))}
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const handleExport = async ({ startDate, endDate, format }) => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(
        `${API_BASE_URL}/analytics.php?project=${selectedId}&startDate=${startDate}&endDate=${endDate}&export=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok || !data.configured) throw new Error(data.error || 'Error al exportar');
      const label = selectedProject ? getLabel(selectedProject) : 'analytics';
      if (format === 'xls') generateCSV(data, label, startDate, endDate);
      else                   generatePDF(data, label, startDate, endDate);
      setExportOpen(false);
    } catch (e) {
      alert('Error al exportar: ' + e.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Ver analíticas de un proyecto
  const handleView = (project) => {
    setSelectedId(project.id);
    setView('detail');
    setError(null);
  };

  // Volver al mosaico
  const handleBack = () => {
    setView('grid');
    setSelectedId(null);
    setAnalytics(null);
    setError(null);
  };

  // Etiqueta visible de un proyecto
  const getLabel = (p) => meta.labels[p.id] || (p.id === 'kodeo' ? 'kodeo.mx' : p.serviceType);

  const selectedProject = projects.find(p => p.id === selectedId);

  const fmtTime = d => d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

  // ── Datos del dashboard ──
  const ov  = analyticsData?.overview;
  const cur = ov?.current  ?? {};
  const prv = ov?.previous ?? {};
  const maxViews  = analyticsData?.pages?.[0]?.views     ?? 1;
  const maxEvents = analyticsData?.events?.[0]?.count    ?? 1;
  const totalSess = cur.sessions ?? 0;
  const evMap = Object.fromEntries((analyticsData?.events ?? []).map(e => [e.name, e.count]));
  const funnel = [
    { label: 'Visita',                key: 'page_view',   n: 1 },
    { label: 'Clic en CTA',           key: 'cta_click',   n: 2 },
    { label: 'Formulario iniciado',   key: 'form_start',  n: 3 },
    { label: 'Formulario completado', key: 'form_submit', n: 4 },
  ].map(s => ({ ...s, count: evMap[s.key] ?? 0 }));
  const funnelTop = funnel[0].count || 1;

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <style>{`
        @keyframes kd-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes kd-spin   { to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VISTA MOSAICO                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'grid' && (
          <>
            {/* Header */}
            <div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 34, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                Mis analíticas
              </h1>
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
                Selecciona un proyecto para ver sus analíticas. Haz clic en el nombre para añadir o editar una etiqueta.
              </p>
            </div>

            {/* Mosaico de tarjetas */}
            {loadingMeta ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 180, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', animation: 'kd-pulse 1.4s ease-in-out infinite' }} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--type)', margin: '0 0 8px' }}>Sin proyectos aún</p>
                <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: '0 0 24px', lineHeight: 1.6 }}>
                  Cuando contrates un servicio aparecerá aquí con sus analíticas.
                </p>
                <button
                  onClick={() => onNavigate?.('/comprar')}
                  style={{
                    background: 'var(--type)', color: 'var(--bg)', border: 0,
                    padding: '11px 22px', borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  Ver servicios →
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    label={getLabel(project)}
                    isConfigured={meta.configured[project.id] ?? false}
                    onView={handleView}
                    onSaveLabel={(label) => saveLabel(project.id, label)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VISTA DETALLE (DASHBOARD)                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'detail' && (
          <>
            {/* Header de detalle */}
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                {/* Botón volver */}
                <button
                  onClick={handleBack}
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
                  Mis analíticas
                </button>

                {selectedProject && (
                  <p style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 4px' }}>
                    {selectedProject.serviceType}
                  </p>
                )}
                <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 24 : 30, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                  {selectedProject ? getLabel(selectedProject) : ''}
                </h1>
                {lastUpdate && (
                  <p style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', margin: '5px 0 0', letterSpacing: '.08em' }}>
                    Actualizado a las {fmtTime(lastUpdate)}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Botón exportar */}
                {analyticsData?.configured && (
                  <button
                    onClick={() => setExportOpen(true)}
                    disabled={loading || refreshing}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                      padding: '8px 16px', borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--line)', background: 'var(--bg-2)',
                      color: 'var(--type-soft)', cursor: loading || refreshing ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1, transition: 'border-color .2s, color .2s',
                    }}
                    onMouseEnter={e => { if (!loading && !refreshing) { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar
                  </button>
                )}

                {/* Botón actualizar */}
                <button
                  onClick={() => { if (!refreshing && !loading) loadAnalytics(selectedId, period, true); }}
                  disabled={loading || refreshing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                    padding: '8px 16px', borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--line)', background: 'var(--bg-2)',
                    color: 'var(--type-soft)', cursor: loading || refreshing ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1, transition: 'border-color .2s, color .2s',
                  }}
                  onMouseEnter={e => { if (!loading && !refreshing) { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: refreshing ? 'kd-spin .8s linear infinite' : 'none' }}>
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>

                {/* Selector de período */}
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      style={{
                        fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                        padding: '7px 15px', borderRadius: 'var(--radius-pill)', border: 0, cursor: 'pointer',
                        background: period === p.value ? 'var(--type)' : 'transparent',
                        color:      period === p.value ? 'var(--bg)'   : 'var(--type-soft)',
                        transition: 'background .2s, color .2s',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid #dc2626', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
                <span style={{ fontFamily: 'var(--body)', fontSize: 13, color: '#dc2626' }}>{error}</span>
              </div>
            )}

            {/* Cargando */}
            {loading && !error && <Skeleton isMobile={isMobile} />}

            {/* En configuración */}
            {!loading && !error && analyticsData && !analyticsData.configured && analyticsData.pending && (
              <Pending projectLabel={selectedProject ? getLabel(selectedProject) : 'proyecto'} />
            )}

            {/* No configurado (kodeo.mx sin creds) */}
            {!loading && !error && analyticsData && !analyticsData.configured && !analyticsData.pending && <NotConfigured />}

            {/* Modal exportar */}
            {exportOpen && (
              <ExportModal
                defaultPeriod={period}
                onClose={() => setExportOpen(false)}
                onExport={handleExport}
                loading={exportLoading}
              />
            )}

            {/* Dashboard */}
            {!loading && !error && analyticsData?.configured && (
              <>
                {analyticsData.realtime && (
                  <RealtimeCard realtime={analyticsData.realtime} isMobile={isMobile} />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12 }}>
                  <KpiCard label="Usuarios activos" value={cur.users}      previous={prv.users}     />
                  <KpiCard label="Sesiones"          value={cur.sessions}   previous={prv.sessions}  />
                  <KpiCard label="Vistas de página"  value={cur.pageViews}  previous={prv.pageViews} />
                  <KpiCard label="Tasa de rebote"    value={cur.bounceRate} previous={prv.bounceRate} format={v => v} suffix="%" />
                </div>

                <Card title={`Sesiones diarias — ${PERIODS.find(p => p.value === period)?.label}`}>
                  <div style={{ padding: '16px 20px 8px' }}>
                    <AreaChart data={analyticsData.daily} metric="sessions" />
                  </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <Card title="Fuentes de tráfico">
                    <div style={{ padding: '20px 20px 16px' }}>
                      <DonutChart sources={analyticsData.sources} total={totalSess} />
                    </div>
                  </Card>
                  <Card title="Páginas más visitadas">
                    {analyticsData.pages.length === 0
                      ? <Empty />
                      : analyticsData.pages.map((p, i) => (
                          <BarRow key={i} label={p.path} value={p.views} max={maxViews}
                            badge={cur.pageViews ? `${Math.round((p.views / cur.pageViews) * 100)}%` : null}
                            color="#5170ff" />
                        ))
                    }
                  </Card>
                </div>

                <Card title="Eventos registrados">
                  {analyticsData.events.length === 0
                    ? <Empty />
                    : analyticsData.events.map((e, i) => (
                        <BarRow key={i} label={e.name} value={e.count} max={maxEvents} color={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))
                  }
                </Card>

                <Card title="Embudo de conversión">
                  <div style={{ padding: '8px 0' }}>
                    {funnel.map((s, i) => {
                      const convPct = i === 0 ? 100 : funnelTop > 0 ? Math.round((s.count / funnelTop) * 100) : 0;
                      const stepPct = i === 0 ? null : (funnel[i-1].count > 0 ? Math.round((s.count / funnel[i-1].count) * 100) : 0);
                      return (
                        <div key={i} style={{ padding: '12px 20px', borderBottom: i < funnel.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type-muted)', width: 18, textAlign: 'center', flexShrink: 0 }}>{s.n}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', marginBottom: 5 }}>{s.label}</div>
                            <div style={{ height: 3, background: 'var(--line)', borderRadius: 2 }}>
                              <div style={{ width: `${convPct}%`, height: '100%', background: CHART_COLORS[i], borderRadius: 2, transition: 'width .5s ease' }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--type)' }}>{fmt(s.count)}</div>
                            {stepPct !== null && <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', marginTop: 1 }}>{stepPct}% del paso anterior</div>}
                          </div>
                          <div style={{ width: 42, textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--ui)', fontSize: 12, color: convPct === 100 ? '#16a34a' : 'var(--type-muted)' }}>{convPct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
