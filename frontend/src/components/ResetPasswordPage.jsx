import { useState } from 'react';
import logoSvg from '../assets/logo_black_transparent.svg?url';
import { API_BASE_URL as API } from '../lib/api';

export default function ResetPasswordPage({ copy, onNavigate }) {
  const [token]                 = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const fieldStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--body)',
    fontSize: 14,
    color: 'var(--type)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontFamily: 'var(--ui)',
    fontSize: 10,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: 'var(--type-soft)',
    display: 'block',
    lineHeight: 1.6,
    marginBottom: 6,
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/reset-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al restablecer la contraseña'); return; }
      setSuccess(true);
      setTimeout(() => onNavigate?.('/login'), 1800);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--line)', height: 64,
      }}>
        <a
          href="/"
          onClick={e => { e.preventDefault(); onNavigate?.('/'); }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <img src={logoSvg} alt="Kodeo" style={{ height: 44, filter: 'var(--logo-filter)' }} />
        </a>
      </header>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', padding: '40px 36px',
        }}>
          <p style={{
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em',
            textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 12px',
          }}>
            Cuenta Kodeo
          </p>

          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 32, letterSpacing: '-0.03em',
            color: 'var(--type)', margin: '0 0 6px', lineHeight: 1.1,
          }}>
            Nueva contraseña
          </h1>
          <p style={{
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
            margin: '0 0 32px', lineHeight: 1.5,
          }}>
            Elige una nueva contraseña para tu cuenta.
          </p>

          {!token ? (
            <div style={{
              background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.3)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
              fontFamily: 'var(--body)', fontSize: 13, color: '#e05050', lineHeight: 1.6,
            }}>
              Este enlace no es válido.{' '}
              <a
                href="/recuperar"
                onClick={e => { e.preventDefault(); onNavigate?.('/recuperar'); }}
                style={{ color: '#e05050', textDecoration: 'underline' }}
              >
                Solicita uno nuevo
              </a>.
            </div>
          ) : success ? (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
              fontFamily: 'var(--body)', fontSize: 13, color: '#22c55e', lineHeight: 1.6,
            }}>
              ¡Contraseña actualizada! Redirigiendo al inicio de sesión...
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.3)',
                  borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 8,
                  fontFamily: 'var(--body)', fontSize: 13, color: '#e05050',
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      style={{ ...fieldStyle, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                      onBlur={e => e.target.style.borderColor = 'var(--line)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--type-soft)', padding: 0, display: 'flex',
                      }}
                    >
                      {showPass ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p style={{ fontFamily: 'var(--body)', fontSize: 11, color: '#e05050', margin: '6px 0 0' }}>
                      Mínimo 8 caracteres
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Confirmar contraseña</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                    onBlur={e => e.target.style.borderColor = 'var(--line)'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'var(--type)', color: 'var(--bg)', border: 0,
                    padding: '13px 18px', borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                    textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s', width: '100%', marginTop: 4,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          )}

          <p style={{
            fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)',
            textAlign: 'center', margin: '24px 0 0',
          }}>
            <a
              href="/login"
              onClick={e => { e.preventDefault(); onNavigate?.('/login'); }}
              style={{ color: 'var(--type)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {copy?.authLogin ?? 'Iniciar sesión'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
