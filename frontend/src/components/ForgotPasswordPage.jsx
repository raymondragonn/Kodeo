import { useState } from 'react';
import logoSvg from '../assets/logo_black_transparent.svg';
import { API_BASE_URL as API } from '../lib/api';

export default function ForgotPasswordPage({ copy, onNavigate }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

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
    setLoading(true);
    try {
      const res = await fetch(`${API}/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al procesar la solicitud'); return; }
      setSent(true);
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
        <a
          href="/login"
          onClick={e => { e.preventDefault(); onNavigate?.('/login'); }}
          style={{
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
            textTransform: 'uppercase', color: 'var(--type-soft)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
        >
          {copy?.authLogin ?? 'Iniciar sesión'} →
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
            Recuperar contraseña
          </h1>
          <p style={{
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
            margin: '0 0 32px', lineHeight: 1.5,
          }}>
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          {sent ? (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
              fontFamily: 'var(--body)', fontSize: 13, color: '#22c55e', lineHeight: 1.6,
            }}>
              Si <strong>{email}</strong> está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
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
                  <label style={labelStyle}>Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                    onBlur={e => e.target.style.borderColor = 'var(--line)'}
                    required
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
                  {loading ? 'Enviando...' : 'Enviar enlace →'}
                </button>
              </form>
            </>
          )}

          <p style={{
            fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)',
            textAlign: 'center', margin: '24px 0 0',
          }}>
            ¿Ya la recordaste?{' '}
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
