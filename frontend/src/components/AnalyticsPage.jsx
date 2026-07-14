import { useState, useEffect, useCallback, useRef } from 'react';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import ViewModeSwitch from './ViewModeSwitch';
import { API_BASE_URL } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIOD_VALUES = ['7daysAgo', '28daysAgo', '90daysAgo'];

const CHART_COLORS = ['#5170ff', '#63C44D', '#FFDE59', '#ff6b6b', '#a78bfa', '#fb923c'];

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

function fmtDate(dateStr, locale) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// ── Tarjeta de proyecto ───────────────────────────────────────────────────────

function ProjectCard({ project, label, isConfigured, onView, onSaveLabel, A }) {
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
            {isConfigured ? A.configured : A.configuring}
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
          <span>{A.viewAnalytics}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Tabla de proyectos ────────────────────────────────────────────────────────

const thStyle = {
  textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap',
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
  color: 'var(--type-muted)',
};

const tdStyle = {
  padding: '14px 16px', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type)',
};

function ProjectsTable({ projects, getLabel, meta, onView, isMobile, A }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : 'auto' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>{A.thService}</th>
              <th style={thStyle}>{A.thLabel}</th>
              <th style={thStyle}>{A.thStatus}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{A.thAction}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <ProjectsTableRow
                key={project.id}
                project={project}
                label={getLabel(project)}
                isConfigured={meta.configured[project.id] ?? false}
                onView={onView}
                A={A}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectsTableRow({ project, label, isConfigured, onView, A }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: '1px solid var(--line)', background: hovered ? 'var(--bg-2)' : 'transparent', transition: 'background .15s' }}
    >
      <td style={tdStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.accent, flexShrink: 0 }} />
          {project.serviceType}
        </span>
      </td>
      <td style={{ ...tdStyle, fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.01em' }}>{label}</td>
      <td style={tdStyle}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
          color: isConfigured ? '#16a34a' : 'var(--type-muted)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: isConfigured ? '#16a34a' : 'var(--line-2)' }} />
          {isConfigured ? A.configured : A.configuring}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <button
          onClick={() => onView(project)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
            padding: '7px 14px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--line)', background: 'transparent', color: 'var(--type-soft)', cursor: 'pointer',
            transition: 'border-color .2s, color .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = project.accent; e.currentTarget.style.color = 'var(--type)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
        >
          {A.viewAnalytics}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ── Gráfico de área (SVG) ─────────────────────────────────────────────────────

function AreaChart({ data, metric = 'sessions', A, locale }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type-muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
        {A.insufficientData}
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
            {fmtDate(d.date, locale)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Gráfico de dona (SVG) ─────────────────────────────────────────────────────

function DonutChart({ sources, total, A }) {
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
          <span style={{ fontFamily: 'var(--ui)', fontSize: 9, color: 'var(--type-muted)', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>{A.donutSessions}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segs.slice(0, 5).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{A.channels[s.channel] || s.channel}</span>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type)', flexShrink: 0 }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Realtime Card ─────────────────────────────────────────────────────────────

function RealtimeCard({ realtime, isMobile, A }) {
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
          {A.rtNow}
        </span>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', letterSpacing: '.06em' }}>
          {A.rtLast30}
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
            {A.rtActiveUsers}
          </span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 42, letterSpacing: '-0.03em', color: activeUsers > 0 ? '#16a34a' : 'var(--type)', lineHeight: 1 }}>
            {activeUsers}
          </span>
          <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', display: 'block', marginTop: 4 }}>
            {activeUsers === 1 ? A.rtPersonOnSite : A.rtPeopleOnSite}
          </span>
        </div>

        {/* Páginas activas */}
        <div style={{ padding: '20px 0', borderRight: isMobile ? 'none' : '1px solid var(--line)', borderBottom: isMobile ? '1px solid var(--line)' : 'none' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', display: 'block', padding: '0 24px', marginBottom: 10 }}>
            {A.rtActivePages}
          </span>
          {pages.length === 0
            ? <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', padding: '0 24px' }}>{A.rtNoActivity}</span>
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
            {A.rtRecentEvents}
          </span>
          {events.length === 0
            ? <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', padding: '0 24px' }}>{A.rtNoEvents}</span>
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

function KpiCard({ label, value, previous, suffix = '', format = fmt, A }) {
  const pct = trendPct(value, previous);
  const up  = pct !== null && pct >= 0;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '-0.03em', color: 'var(--type)', lineHeight: 1.1 }}>{format(value)}{suffix}</span>
      {pct !== null
        ? <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: up ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>{up ? '↑' : '↓'} {A.vsPrev.replace('{n}', Math.abs(pct))}</span>
        : <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--type-muted)' }}>{A.noPrev}</span>
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

function Empty({ text }) {
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

function ExportModal({ defaultPeriod, onClose, onExport, loading, A }) {
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
          {A.exportTitle}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: A.from, value: start, onChange: setStart, max: end },
            { label: A.to,   value: end,   onChange: setEnd,   min: start, max: todayStr },
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
            {A.format}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ value: 'xls', label: A.formatExcel }, { value: 'pdf', label: A.formatPdf }].map(opt => (
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
            {A.cancel}
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
            {loading ? A.exporting : A.export}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estado no configurado ─────────────────────────────────────────────────────

function NotConfigured({ A }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', padding: '14px 20px' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>{A.ncTitle}</span>
      </div>
      <div style={{ background: 'var(--bg-2)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 6px' }}>{A.ncHeading}</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
            {A.ncBody}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {A.ncSteps.map((text, i) => (
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

function Pending({ projectLabel, A }) {
  const [pendingBefore, pendingAfter] = A.pendingBody.split('{name}');
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', padding: '14px 20px' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)' }}>{A.pendingTitle}</span>
      </div>
      <div style={{ background: 'var(--bg-2)', padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--line-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 8px' }}>{A.pendingHeading}</p>
          <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.7, maxWidth: 400 }}>
            {pendingBefore}<strong style={{ color: 'var(--type)', fontWeight: 500 }}>{projectLabel}</strong>{pendingAfter}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AnalyticsPage({ user, onNavigate, onLogout, copy, theme, onThemeToggle }) {
  const A      = copy.portal.analytics;
  const locale = copy.portal.locale;
  const periods = PERIOD_VALUES.map((value, i) => ({ value, label: A.periodLabels[i] }));

  // Vista: 'grid' = mosaico de proyectos | 'detail' = dashboard de analíticas
  const [view,          setView]         = useState('grid');
  const [projectsView,  setProjectsView] = useState('mosaico'); // 'mosaico' | 'tabla'
  const [projects,      setProjects]     = useState([]);
  const [meta,          setMeta]         = useState({ labels: {}, configured: {} });
  const [loadingMeta,   setLoadingMeta]  = useState(() => !!localStorage.getItem('token'));
  const [refreshingMeta, setRefreshingMeta] = useState(false);
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

  // Cargar proyectos + etiquetas
  const loadProjects = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (isRefresh) setRefreshingMeta(true);
    else setLoadingMeta(true);

    try {
      const [projectsJson, metaJson] = await Promise.all([
        fetch(`${API_BASE_URL}/projects.php`,              { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE_URL}/analytics.php?action=meta`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);

      // projects.php ya filtra en el backend: los clientes reciben solo sus
      // proyectos; los administradores todos (para configurar/consultar la
      // analítica de cualquier proyecto de cliente).
      const statusAccent = {
        diagnostico:   '#8f8f8f',
        en_diseno:     '#5170ff',
        en_desarrollo: '#FFDE59',
        completado:    '#63C44D',
      };
      const projectCards = (projectsJson.projects ?? [])
        .filter(p => p.status !== 'cancelado')
        .map(p => ({
          id:          String(p.id),
          serviceType: p.name,
          accent:      statusAccent[p.status] ?? '#5170ff',
        }));

      const isAdmin = user?.role === 'administrador';
      const base = isAdmin ? [{ id: 'kodeo', serviceType: A.ownPlatform, accent: '#5170ff' }] : [];
      setProjects([...base, ...projectCards]);
      setMeta({ labels: metaJson.labels ?? {}, configured: metaJson.configured ?? {} });
    } catch {
      // Se ignora — el mosaico simplemente conserva los datos anteriores
    } finally {
      setLoadingMeta(false);
      setRefreshingMeta(false);
    }
  }, [user, A]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [user, loadProjects]);

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
      if (!res.ok) throw new Error(json.error || A.errorLoad);
      setAnalytics(json);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [A]);

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
      [A.csvTitle.replace('{name}', label)],
      [A.expPeriod, `${startDate} — ${endDate}`],
      [A.expExported, new Date().toLocaleString(locale)],
      [],
      [A.csvSummary],
      [A.expMetric, A.expValue, A.expPrevPeriod],
      [A.expActiveUsers,   cur.users,      prv.users],
      [A.expSessions,      cur.sessions,   prv.sessions],
      [A.expPageViews,     cur.pageViews,  prv.pageViews],
      [A.expBounceRateCsv, cur.bounceRate, prv.bounceRate],
      [],
      [A.csvTopPages],
      [A.expPage, A.expViews],
      ...data.pages.map(p => [p.path, p.views]),
      [],
      [A.csvSources],
      [A.expChannel, A.expSessions],
      ...data.sources.map(s => [A.channels[s.channel] || s.channel, s.sessions]),
      [],
      [A.csvEvents],
      [A.expEvent, A.expCount],
      ...data.events.map(e => [e.name, e.count]),
      [],
      [A.csvDaily],
      [A.expDate, A.expUsers, A.expSessions],
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
    const now = new Date().toLocaleString(locale);
    const th  = `padding:8px 12px;background:#f5f5f5;border:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666;text-align:left;`;
    const td  = `padding:8px 12px;border:1px solid #ddd;font-size:12px;color:#333;`;
    const tbl = (headers, rows) =>
      `<table style="border-collapse:collapse;width:100%;margin-bottom:28px">
        <thead><tr>${headers.map(h => `<th style="${th}">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td style="${td}">${c ?? 0}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    const html = `<!DOCTYPE html><html lang="${locale.slice(0, 2)}"><head><meta charset="UTF-8">
      <title>${A.pdfTitle.replace('{name}', label)}</title>
      <style>body{font-family:sans-serif;color:#333;margin:40px;font-size:13px}h1{font-size:22px;margin:0 0 4px}
      h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:24px 0 8px}
      .meta{color:#666;font-size:12px;margin-bottom:28px}@media print{body{margin:20px}}</style>
    </head><body>
      <h1>${A.pdfTitle.replace('{name}', label)}</h1>
      <p class="meta">${A.expPeriod}: ${startDate} — ${endDate} &nbsp;·&nbsp; ${A.expExported}: ${now}</p>
      <h2>${A.pdfSummary}</h2>
      ${tbl([A.expMetric,A.expValue,A.expPrevPeriod],[
        [A.expActiveUsers,cur.users,prv.users],
        [A.expSessions,cur.sessions,prv.sessions],
        [A.expPageViews,cur.pageViews,prv.pageViews],
        [A.expBounceRatePdf,cur.bounceRate+'%',prv.bounceRate+'%'],
      ])}
      <h2>${A.pdfTopPages}</h2>
      ${tbl([A.expPage,A.expViews],data.pages.map(p=>[p.path,p.views]))}
      <h2>${A.pdfSources}</h2>
      ${tbl([A.expChannel,A.expSessions],data.sources.map(s=>[A.channels[s.channel]||s.channel,s.sessions]))}
      <h2>${A.pdfEvents}</h2>
      ${tbl([A.expEvent,A.expCount],data.events.map(e=>[e.name,e.count]))}
      <h2>${A.pdfDaily}</h2>
      ${tbl([A.expDate,A.expUsers,A.expSessions],data.daily.map(d=>[d.date,d.users,d.sessions]))}
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
      if (!res.ok || !data.configured) throw new Error(data.error || A.errorExport);
      const label = selectedProject ? getLabel(selectedProject) : 'analytics';
      if (format === 'xls') generateCSV(data, label, startDate, endDate);
      else                   generatePDF(data, label, startDate, endDate);
      setExportOpen(false);
    } catch (e) {
      alert(A.errorExport + ': ' + e.message);
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

  const fmtTime = d => d ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';

  // ── Datos del dashboard ──
  const ov  = analyticsData?.overview;
  const cur = ov?.current  ?? {};
  const prv = ov?.previous ?? {};
  const maxViews  = analyticsData?.pages?.[0]?.views     ?? 1;
  const maxEvents = analyticsData?.events?.[0]?.count    ?? 1;
  const totalSess = cur.sessions ?? 0;
  const evMap = Object.fromEntries((analyticsData?.events ?? []).map(e => [e.name, e.count]));
  const funnel = [
    { key: 'page_view',   n: 1 },
    { key: 'cta_click',   n: 2 },
    { key: 'form_start',  n: 3 },
    { key: 'form_submit', n: 4 },
  ].map((s, i) => ({ ...s, label: A.funnelSteps[i], count: evMap[s.key] ?? 0 }));
  const funnelTop = funnel[0].count || 1;

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <style>{`
        @keyframes kd-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VISTA MOSAICO                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'grid' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 34, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
                  {A.title}
                </h1>
                <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: '8px 0 0', lineHeight: 1.5 }}>
                  {A.subtitle}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                {!loadingMeta && projects.length > 0 && (
                  <ViewModeSwitch
                    value={projectsView}
                    onChange={setProjectsView}
                    options={[
                      { id: 'mosaico', label: A.viewMosaic, icon: 'grid' },
                      { id: 'tabla',   label: A.viewTable,  icon: 'list' },
                    ]}
                  />
                )}
                <RefreshButton onClick={() => loadProjects(true)} loading={refreshingMeta} />
              </div>
            </div>

            {/* Mosaico / tabla de proyectos */}
            {loadingMeta ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 180, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', animation: 'kd-pulse 1.4s ease-in-out infinite' }} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--type)', margin: '0 0 8px' }}>{A.noProjectsTitle}</p>
                <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: '0 0 24px', lineHeight: 1.6 }}>
                  {A.noProjectsBody}
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
                  {A.viewServices}
                </button>
              </div>
            ) : projectsView === 'tabla' ? (
              <ProjectsTable
                projects={projects}
                getLabel={getLabel}
                meta={meta}
                onView={handleView}
                isMobile={isMobile}
                A={A}
              />
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
                    A={A}
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
                  {A.title}
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
                    {A.updatedAt.replace('{n}', fmtTime(lastUpdate))}
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
                    {A.export}
                  </button>
                )}

                {/* Botón actualizar */}
                <RefreshButton
                  onClick={() => loadAnalytics(selectedId, period, true)}
                  loading={loading || refreshing}
                />

                {/* Selector de período */}
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
                  {periods.map(p => (
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
              <Pending projectLabel={selectedProject ? getLabel(selectedProject) : A.projectFallback} A={A} />
            )}

            {/* No configurado (kodeo.mx sin creds) */}
            {!loading && !error && analyticsData && !analyticsData.configured && !analyticsData.pending && <NotConfigured A={A} />}

            {/* Modal exportar */}
            {exportOpen && (
              <ExportModal
                defaultPeriod={period}
                onClose={() => setExportOpen(false)}
                onExport={handleExport}
                loading={exportLoading}
                A={A}
              />
            )}

            {/* Dashboard */}
            {!loading && !error && analyticsData?.configured && (
              <>
                {analyticsData.realtime && (
                  <RealtimeCard realtime={analyticsData.realtime} isMobile={isMobile} A={A} />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12 }}>
                  <KpiCard label={A.kpiUsers}      value={cur.users}      previous={prv.users}      A={A} />
                  <KpiCard label={A.kpiSessions}   value={cur.sessions}   previous={prv.sessions}   A={A} />
                  <KpiCard label={A.kpiPageViews}  value={cur.pageViews}  previous={prv.pageViews}  A={A} />
                  <KpiCard label={A.kpiBounceRate} value={cur.bounceRate} previous={prv.bounceRate} format={v => v} suffix="%" A={A} />
                </div>

                <Card title={`${A.dailySessions} — ${periods.find(p => p.value === period)?.label}`}>
                  <div style={{ padding: '16px 20px 8px' }}>
                    <AreaChart data={analyticsData.daily} metric="sessions" A={A} locale={locale} />
                  </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <Card title={A.trafficSources}>
                    <div style={{ padding: '20px 20px 16px' }}>
                      <DonutChart sources={analyticsData.sources} total={totalSess} A={A} />
                    </div>
                  </Card>
                  <Card title={A.topPages}>
                    {analyticsData.pages.length === 0
                      ? <Empty text={A.noData} />
                      : analyticsData.pages.map((p, i) => (
                          <BarRow key={i} label={p.path} value={p.views} max={maxViews}
                            badge={cur.pageViews ? `${Math.round((p.views / cur.pageViews) * 100)}%` : null}
                            color="#5170ff" />
                        ))
                    }
                  </Card>
                </div>

                <Card title={A.eventsCard}>
                  {analyticsData.events.length === 0
                    ? <Empty text={A.noData} />
                    : analyticsData.events.map((e, i) => (
                        <BarRow key={i} label={e.name} value={e.count} max={maxEvents} color={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))
                  }
                </Card>

                <Card title={A.funnelCard}>
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
                            {stepPct !== null && <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--type-muted)', marginTop: 1 }}>{A.ofPrevStep.replace('{n}', stepPct)}</div>}
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
