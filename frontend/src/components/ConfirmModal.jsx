import { createPortal } from 'react-dom';

// Modal de confirmación genérico (cancelar proyecto / cita, etc.)
export default function ConfirmModal({ title, message, confirmLabel, cancelLabel, busy, onConfirm, onCancel }) {
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', padding: 26, maxWidth: 380, width: '100%',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,.4)',
        }}
      >
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em', margin: '0 0 10px', color: 'var(--type)' }}>
          {title}
        </h3>
        <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', lineHeight: 1.6, margin: '0 0 22px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '9px 18px', background: 'transparent', color: 'var(--type-soft)',
              border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '9px 18px', background: '#e05050', color: '#fff',
              border: 0, borderRadius: 'var(--radius-pill)',
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
