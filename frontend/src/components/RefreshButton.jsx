export default function RefreshButton({ onClick, loading, label = 'Actualizar', loadingLabel = 'Actualizando...' }) {
  return (
    <>
      <style>{`@keyframes kd-refresh-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={() => { if (!loading) onClick(); }}
        disabled={loading}
        title={label}
        aria-label={label}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
          padding: '8px 16px', borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--line)', background: 'var(--bg-2)',
          color: 'var(--type-soft)', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--type)'; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--type-soft)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: loading ? 'kd-refresh-spin .8s linear infinite' : 'none' }}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {loading ? loadingLabel : label}
      </button>
    </>
  );
}
