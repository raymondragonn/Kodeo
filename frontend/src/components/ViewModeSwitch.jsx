function ViewModeIcon({ type, color }) {
  if (type === 'grid') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1" fill={color} stroke="none" /><circle cx="3" cy="12" r="1" fill={color} stroke="none" /><circle cx="3" cy="18" r="1" fill={color} stroke="none" />
    </svg>
  );
}

export default function ViewModeSwitch({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 4, flexShrink: 0 }}>
      {options.map(opt => {
        const active = value === opt.id;
        const color  = active ? 'var(--type)' : 'var(--type-muted)';
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
              background: active ? 'var(--bg-3)' : 'transparent',
              border: active ? '1px solid var(--line)' : '1px solid transparent',
              borderRadius: 'var(--radius)', color,
              padding: '6px 10px', cursor: 'pointer', transition: 'all 0.18s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ViewModeIcon type={opt.icon} color={color} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
