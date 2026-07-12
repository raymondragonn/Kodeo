import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import logoSvg from '../assets/logo_black_transparent.svg';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { API_BASE_URL as API } from '../lib/api';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export default function RegisterPage({ copy, onNavigate }) {
  const location      = useLocation();
  // kodeo_redirect respalda el destino (p. ej. /pago/orden/:token) si el state se pierde
  const redirectTo    = location.state?.from ?? localStorage.getItem('kodeo_redirect') ?? '/citas';
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showManual, setShowManual] = useState(false); // form de correo oculto hasta pedirlo

  // Requisitos de contraseña — deben coincidir con las validaciones de register.php
  const passwordChecks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Una letra minúscula',   ok: /[a-z]/.test(password) },
    { label: 'Una letra mayúscula',   ok: /[A-Z]/.test(password) },
    { label: 'Un número',             ok: /[0-9]/.test(password) },
    { label: 'Un carácter especial',  ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordValid = passwordChecks.every(c => c.ok);

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

  const handleGoogleRegister = async () => {
    if (!auth) {
      setError('Registro con Google no está configurado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const displayName = result.user.displayName || null;
      
      // Enviar al backend para crear/vincular cuenta
      const res = await fetch(`${API}/oauth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token: idToken, name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) { 
        setError(data.error ?? 'Error al registrarse con Google'); 
        setLoading(false);
        return; 
      }
      
      // Guardar token y redirigir a login o dashboard
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.removeItem('kodeo_redirect');
      setSuccess(true);
      // Reload completo para que App.jsx lea el usuario de localStorage, luego va al destino
      setTimeout(() => { window.location.href = redirectTo; }, 1000);
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        setError('Error al registrarse con Google: ' + error?.message);
      }
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 32px',
        borderBottom: '1px solid var(--line)',
        height: 64,
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
          onClick={e => { e.preventDefault(); onNavigate?.('/login', { state: location.state }); }}
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
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 36px',
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
            {copy?.authRegister ?? 'Registrarme'}
          </h1>
          <p style={{
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
            margin: '0 0 32px', lineHeight: 1.5,
          }}>
            Crea tu cuenta para dar seguimiento a tu proyecto.
          </p>

          {success && (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 8,
              fontFamily: 'var(--body)', fontSize: 13, color: '#22c55e',
            }}>
              ¡Cuenta creada! Redirigiendo al inicio de sesión...
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.3)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 8,
              fontFamily: 'var(--body)', fontSize: 13, color: '#e05050',
            }}>
              {error}
            </div>
          )}

          {/* Google — método principal */}
          <button
            type="button"
            disabled={loading || success}
            onClick={handleGoogleRegister}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', height: 48,
              background: '#ffffff', border: '1px solid var(--line-2)',
              borderRadius: 'var(--radius-pill)', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.14em',
              textTransform: 'uppercase', color: '#1f1f1f',
              transition: 'opacity 0.2s', opacity: loading || success ? 0.6 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Registrarse con Google
          </button>

          {!showManual && (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              style={{
                width: '100%', height: 48, marginTop: 10,
                background: 'transparent', color: 'var(--type)',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.14em',
                textTransform: 'uppercase',
                transition: 'opacity 0.2s, border-color 0.2s',
              }}
            >
              Continuar con correo
            </button>
          )}

          {showManual && (
          <>
          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 20px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em',
              textTransform: 'uppercase', color: 'var(--type-muted)', whiteSpace: 'nowrap',
            }}>
              O con tu correo
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <form onSubmit={async e => {
            e.preventDefault();
            if (!passwordValid) return;
            setError('');
            setLoading(true);
            try {
              const res = await fetch(`${API}/register.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
              });
              const data = await res.json();
              if (!res.ok) { setError(data.error ?? 'Error al registrar'); return; }
              setSuccess(true);
              setTimeout(() => onNavigate?.('/login', { state: location.state }), 1800);
            } catch {
              setError('No se pudo conectar con el servidor');
            } finally {
              setLoading(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
            </div>

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
              />
            </div>

            <div>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Crea una contraseña segura"
                  maxLength={64}
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
              {password.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {passwordChecks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: c.ok ? 'none' : '1px solid var(--line-2)',
                        background: c.ok ? '#22c55e' : 'transparent',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}>
                        {c.ok && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span style={{
                        fontFamily: 'var(--body)', fontSize: 12,
                        color: c.ok ? 'var(--type-soft)' : 'var(--type-muted)',
                        transition: 'color 0.2s',
                      }}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success || !passwordValid}
              style={{
                background: 'transparent', color: 'var(--type)',
                border: '1px solid var(--line-2)',
                padding: '13px 18px', borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                textTransform: 'uppercase',
                cursor: (loading || success || !passwordValid) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, border-color 0.2s', width: '100%', marginTop: 4,
                opacity: (loading || success || !passwordValid) ? 0.6 : 1,
              }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>
          </>
          )}

          <p style={{
            fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)',
            textAlign: 'center', margin: '20px 0 0', lineHeight: 1.5,
          }}>
            Al registrarte aceptas nuestros{' '}
            <a href="/terminos" style={{ color: 'var(--type-soft)', textDecoration: 'underline' }}>Términos</a>
            {' '}y{' '}
            <a href="/privacidad" style={{ color: 'var(--type-soft)', textDecoration: 'underline' }}>Privacidad</a>.
          </p>

          <p style={{
            fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)',
            textAlign: 'center', margin: '16px 0 0',
          }}>
            ¿Ya tienes cuenta?{' '}
            <a
              href="/login"
              onClick={e => { e.preventDefault(); onNavigate?.('/login', { state: location.state }); }}
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
