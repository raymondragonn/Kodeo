export default function LangToggle({ lang, onChange }) {
  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 16,
      zIndex: 50,
      display: 'flex',
      gap: 0,
      padding: 3,
      background: 'rgba(14,14,14,0.85)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-pill)',
      backdropFilter: 'blur(14px)',
      fontFamily: 'var(--ui)',
      fontSize: 11,
      letterSpacing: '.18em',
    }}>
      {['es', 'en'].map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          style={{
            background: lang === l ? 'var(--type)' : 'transparent',
            color: lang === l ? 'var(--bg)' : 'var(--type-soft)',
            border: 0,
            padding: '7px 12px',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'uppercase',
            transition: 'background 0.25s, color 0.25s',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
