import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import logoSvg from '../assets/logo_black_transparent.svg';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { API_BASE_URL as API } from '../lib/api';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export default function LoginPage({ copy, theme, onNavigate, onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const appleLoaded  = useRef(false);
  const location     = useLocation();

  // Si venimos de /agendar (o cualquier otra ruta protegida), volvemos ahí después del login
  const redirectTo    = location.state?.from ?? '/citas';
  const redirectState = location.state?.returnState ?? undefined;

  useEffect(() => {
    if (!appleLoaded.current) {
      appleLoaded.current = true;
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.AppleID?.auth.init({
          clientId: import.meta.env.VITE_APPLE_CLIENT_ID ?? '',
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });
      };
      document.body.appendChild(script);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('Inicio de sesión con Google no está configurado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const name = result.user.displayName || null;
      await handleOAuth('google', idToken, name);
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión con Google: ' + error?.message);
      }
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const data = await window.AppleID.auth.signIn();
      const name = data.user
        ? `${data.user.name?.firstName ?? ''} ${data.user.name?.lastName ?? ''}`.trim()
        : null;
      await handleOAuth('apple', data.authorization.id_token, name);
    } catch (e) {
      if (e?.error !== 'popup_closed_by_user') setError('Error con Apple Sign In');
    }
  };

  const handleOAuth = async (provider, token, name) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/oauth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, token, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error de autenticación'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess?.(data.user);
      onNavigate?.(redirectTo, redirectState ? { state: redirectState } : undefined);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

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
          href="/register"
          onClick={e => { e.preventDefault(); onNavigate?.('/register'); }}
          style={{
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
            textTransform: 'uppercase', color: 'var(--type-soft)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
        >
          {copy?.authRegister ?? 'Registrarme'} →
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
          {/* Eyebrow */}
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
            {copy?.authLogin ?? 'Iniciar sesión'}
          </h1>
          <p style={{
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)',
            margin: '0 0 32px', lineHeight: 1.5,
          }}>
            Accede a tu panel de proyectos y seguimiento.
          </p>

          {error && (
            <div style={{
              background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.3)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 8,
              fontFamily: 'var(--body)', fontSize: 13, color: '#e05050',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={async e => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              const res = await fetch(`${API}/login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
              });
              const data = await res.json();
              if (!res.ok) { setError(data.error ?? 'Error al iniciar sesión'); return; }
              localStorage.setItem('token', data.token);
              localStorage.setItem('user', JSON.stringify(data.user));
              onLoginSuccess?.(data.user);
              onNavigate?.(redirectTo, redirectState ? { state: redirectState } : undefined);
            } catch {
              setError('No se pudo conectar con el servidor');
            } finally {
              setLoading(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Usuario o correo electrónico</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="usuario o tu@correo.com"
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
                  placeholder="••••••••"
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href="/recuperar"
                onClick={e => { e.preventDefault(); onNavigate?.('/recuperar'); }}
                style={{
                  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em',
                  textTransform: 'uppercase', color: 'var(--type-soft)',
                  textDecoration: 'none', transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
              >
                ¿Olvidaste tu contraseña?
              </a>
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
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>

          {/* OAuth divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 20px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{
              fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em',
              textTransform: 'uppercase', color: 'var(--type-muted)', whiteSpace: 'nowrap',
            }}>
              O continúa con
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Google */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', height: 46,
                background: 'var(--bg-2)', border: '1px solid var(--line)',
                borderRadius: 'var(--radius-pill)', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                textTransform: 'uppercase', color: 'var(--type)',
                transition: 'opacity 0.2s', opacity: loading ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continuar con Google
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled={loading}
              onClick={handleAppleSignIn}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', height: 46,
                background: theme === 'dark' ? '#ffffff' : '#000000',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-pill)', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                textTransform: 'uppercase', color: theme === 'dark' ? '#000000' : '#ffffff',
                transition: 'opacity 0.2s', opacity: loading ? 0.6 : 1,
              }}
            >
              <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.4-150.3-109.9C85 536 36 448.5 36 362.9c0-153.9 100.3-235.5 198.3-235.5 52.6 0 96.5 34.4 129.4 34.4 31.3 0 80.4-36.9 140.3-36.9 22.7 0 108.2 2 159.2 82.4zm-106.9-71.4c-19.8-23.4-33.6-56.4-33.6-89.4 0-4.5.4-9 1.2-13.5 32.7 12.8 60.9 39.5 78.4 67.1 12.8 19.5 24.4 49.4 24.4 79.4 0 4.5-.5 9.2-1 13.7-3.9.5-8.6.9-13.4.9-29.9 0-58.8-18.8-56-58.2z"/>
              </svg>
              Continuar con Apple
            </button>
          </div>

          <p style={{
            fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)',
            textAlign: 'center', margin: '24px 0 0',
          }}>
            ¿No tienes cuenta?{' '}
            <a
              href="/register"
              onClick={e => { e.preventDefault(); onNavigate?.('/register'); }}
              style={{ color: 'var(--type)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {copy?.authRegister ?? 'Registrarme'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
