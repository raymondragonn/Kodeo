import { useState } from 'react';
import PortalLayout from './PortalLayout';
import { API_BASE_URL as API } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

function Field({ label, value, type = 'text', editing, onChange }) {
  const base = {
    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
    background: editing ? 'var(--bg)' : 'transparent',
    border: editing ? '1px solid var(--line-2)' : '1px solid transparent',
    borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 14,
    color: 'var(--type)', outline: 'none', transition: 'all 0.2s',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
        {label}
      </label>
      <input
        type={type} value={value} readOnly={!editing}
        onChange={e => onChange?.(e.target.value)}
        style={{ ...base, cursor: editing ? 'text' : 'default' }}
        onFocus={e => { if (editing) e.target.style.borderColor = 'var(--line-2)'; }}
        onBlur={e => { if (editing) e.target.style.borderColor = 'var(--line)'; }}
      />
    </div>
  );
}

export default function AccountPage({ user, onNavigate, onLogout, onUserUpdate, copy, theme, onThemeToggle }) {
  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(user?.name     ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail]       = useState(user?.email    ?? '');
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { isMobile } = useBreakpoint();

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/account.php`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, username, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar los cambios'); return; }

      localStorage.setItem('token', data.token);
      onUserUpdate?.(data.user);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name ?? '');
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
    setError('');
    setEditing(false);
  };

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <div style={{ maxWidth: 600, width: '100%', margin: '0 auto', padding: isMobile ? '28px 16px 48px' : '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 8px' }}>
            {user?.username}
          </p>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
            Mi cuenta
          </h1>
        </div>

        {/* Card */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{
            padding: '18px 24px', background: 'var(--bg-2)',
            borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-soft)' }}>
              Información personal
            </span>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{
                fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
                color: 'var(--type-soft)', background: 'none', border: '1px solid var(--line)',
                borderRadius: 'var(--radius)', padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--type)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--type-soft)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
              >
                Editar
              </button>
            )}
          </div>

          {/* Fields */}
          <div style={{ padding: '24px', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Nombre completo" value={name}     editing={editing} onChange={setName} />
            <Field label="Usuario"         value={username} editing={editing} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
            <Field label="Correo"          value={email}    editing={editing} onChange={setEmail} type="email" />
            {editing && error && (
              <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: '#e05050', margin: 0 }}>
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          {editing && (
            <div style={{
              padding: '16px 24px', background: 'var(--bg-3)',
              borderTop: '1px solid var(--line)',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button onClick={handleCancel} disabled={loading} style={{
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                background: 'transparent', border: '1px solid var(--line)', color: 'var(--type-soft)',
                padding: '10px 18px', borderRadius: 'var(--radius-pill)', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading} style={{
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                background: 'var(--type)', color: 'var(--bg)', border: 0,
                padding: '10px 22px', borderRadius: 'var(--radius-pill)', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : 'Guardar →'}
              </button>
            </div>
          )}
        </div>

        {saved && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius)',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            fontFamily: 'var(--body)', fontSize: 13, color: '#16a34a',
          }}>
            Cambios guardados correctamente.
          </div>
        )}

        {/* Danger zone */}
        <div style={{ marginTop: 32, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#dc2626' }}>
              Zona de peligro
            </span>
          </div>
          <div style={{ padding: '20px 24px', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type)', margin: '0 0 4px' }}>
                Cerrar sesión
              </p>
              <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-soft)', margin: 0 }}>
                Tu sesión se cerrará en este dispositivo.
              </p>
            </div>
            <button onClick={onLogout} style={{
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
              background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#dc2626',
              padding: '10px 18px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Cerrar sesión →
            </button>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
