import { useState, useEffect, useRef } from 'react';
import logoSvg from '../assets/logo_black_transparent.svg';

const API = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080';

const MSI_OPTIONS = [
  { value: 0,  label: 'Pago de contado' },
  { value: 3,  label: '3 meses sin intereses' },
  { value: 6,  label: '6 meses sin intereses' },
  { value: 9,  label: '9 meses sin intereses' },
  { value: 12, label: '12 meses sin intereses' },
  { value: 18, label: '18 meses sin intereses' },
  { value: 24, label: '24 meses sin intereses' },
];

const METHODS = [
  {
    id: 'card',
    label: 'Tarjeta',
    description: 'Crédito o débito con MSI',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'oxxo',
    label: 'OXXO',
    description: 'Pago en efectivo en tienda',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  },
  {
    id: 'spei',
    label: 'SPEI',
    description: 'Transferencia bancaria',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

export default function Checkout({
  amount    = 650000,
  currency  = 'MXN',
  service   = 'Landing Page',
  theme     = 'dark',
  onBack,
  onNavigate,
}) {
  const [method, setMethod]         = useState('card');
  const [installments, setInstallments] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  const stripeRef    = useRef(null);
  const cardRef      = useRef(null);
  const cardMountRef = useRef(null);

  const displayAmount = (amount / 100).toLocaleString('es-MX', {
    style: 'currency', currency,
  });

  const monthlyAmount = (plan) =>
    plan > 0
      ? (amount / 100 / plan).toLocaleString('es-MX', { style: 'currency', currency })
      : null;

  // ── Cargar Stripe.js ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (stripeRef.current) return;

      const waitForStripe = () =>
        new Promise((resolve) => {
          if (window.Stripe) { resolve(); return; }
          const script = document.querySelector('script[src*="js.stripe.com"]');
          script ? script.addEventListener('load', resolve, { once: true }) : resolve();
        });

      await waitForStripe();
      if (!window.Stripe) return;

      try {
        const res  = await fetch(`${API}/create-payment-intent.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, installments: 0 }),
        });
        const data = await res.json();
        if (data.error || !data.publishableKey) return;
        stripeRef.current = window.Stripe(data.publishableKey);
        setStripeReady(true);
      } catch { /* Stripe no disponible */ }
    };
    init();
  }, [amount]);

  // ── Montar card element ───────────────────────────────────────────────────
  useEffect(() => {
    if (!stripeReady || method !== 'card') return;
    if (cardRef.current) return;

    const isDark   = theme === 'dark';
    const elements = stripeRef.current.elements();
    cardRef.current = elements.create('card', {
      style: {
        base: {
          color:      isDark ? '#ffffff' : '#0d0d0d',
          fontFamily: 'Arial, Helvetica Neue, sans-serif',
          fontSize:   '15px',
          '::placeholder': { color: isDark ? '#666' : '#aaa' },
        },
        invalid: { color: '#e05050' },
      },
    });
    cardRef.current.mount(cardMountRef.current);

    return () => { cardRef.current?.destroy(); cardRef.current = null; };
  }, [stripeReady, method, theme]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearResult = () => setResult(null);

  const postAPI = async (endpoint, body) => {
    const res  = await fetch(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCard = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !cardRef.current) {
      setResult({ type: 'error', title: 'Stripe no está listo. Recarga la página.' });
      return;
    }
    setLoading(true); clearResult();
    try {
      const { clientSecret } = await postAPI('create-payment-intent.php', { amount, installments });
      const { paymentIntent, error } = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: { card: cardRef.current },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent.status === 'succeeded') {
        setResult({
          type: 'success',
          title: '¡Pago exitoso!',
          lines: [
            `Monto: ${displayAmount}`,
            installments > 0 ? `Plan: ${installments} meses sin intereses` : 'Plan: pago de contado',
          ],
          id: paymentIntent.id,
        });
      }
    } catch (err) {
      setResult({ type: 'error', title: 'Error al procesar', lines: [err.message] });
    } finally { setLoading(false); }
  };

  const handleOxxo = async (e) => {
    e.preventDefault();
    const name  = e.target.oxxoName.value.trim();
    const email = e.target.oxxoEmail.value.trim();
    setLoading(true); clearResult();
    try {
      const data = await postAPI('create-oxxo.php', { amount, name, email });
      setResult({
        type: 'info',
        title: 'Voucher OXXO generado',
        lines: [`Monto a pagar: ${displayAmount}`, 'Vigencia: 3 días'],
        link: data.voucherUrl ? { href: data.voucherUrl, label: 'Ver e imprimir voucher →' } : null,
        note: 'Paga en cualquier tienda OXXO antes de que expire.',
        id: data.paymentIntentId,
      });
    } catch (err) {
      setResult({ type: 'error', title: 'Error al generar voucher', lines: [err.message] });
    } finally { setLoading(false); }
  };

  const handleSpei = async (e) => {
    e.preventDefault();
    const name  = e.target.speiName.value.trim();
    const email = e.target.speiEmail.value.trim();
    setLoading(true); clearResult();
    try {
      const data = await postAPI('create-spei.php', { amount, name, email });
      const bd   = data.bankDetails;
      setResult({
        type: 'info',
        title: 'Datos para transferencia SPEI',
        lines: [
          `Monto: ${displayAmount}`,
          bd?.bankName ? `Banco: ${bd.bankName}` : null,
        ].filter(Boolean),
        clabe: bd?.clabe,
        note: 'La confirmación puede tardar de minutos a unas horas.',
        id: data.paymentIntentId,
      });
    } catch (err) {
      setResult({ type: 'error', title: 'Error al generar CLABE', lines: [err.message] });
    } finally { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--line)', height: 64, flexShrink: 0,
      }}>
        <a
          href="/"
          onClick={e => { e.preventDefault(); onNavigate?.('/'); }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <img src={logoSvg} alt="Kodeo" style={{ height: 44, filter: 'var(--logo-filter)' }} />
        </a>
        <button
          onClick={() => onBack?.()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
            textTransform: 'uppercase', color: 'var(--type-soft)',
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--type)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--type-soft)'}
        >
          ← Volver
        </button>
      </header>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px', gap: 32,
        flexWrap: 'wrap',
      }}>

        {/* ── Resumen del pedido ── */}
        <div style={{
          width: '100%', maxWidth: 340,
          display: 'flex', flexDirection: 'column', gap: 24,
          position: 'sticky', top: 48,
        }}>
          <div>
            <p style={eyebrowStyle}>Resumen del pedido</p>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.15 }}>
              {service}
            </h1>
          </div>

          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Servicio</span>
              <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)' }}>{service}</span>
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Moneda</span>
              <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)' }}>{currency}</span>
            </div>
            {installments > 0 && method === 'card' && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Por mes</span>
                <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)' }}>~{monthlyAmount(installments)}</span>
              </div>
            )}
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Total</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)', fontWeight: 700 }}>{displayAmount}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 20px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <svg width="16" height="16" style={{ color: 'var(--type-muted)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: 0, lineHeight: 1.6 }}>
              Pagos procesados de forma segura por <strong style={{ color: 'var(--type-soft)' }}>Stripe</strong>. Tus datos están encriptados.
            </p>
          </div>
        </div>

        {/* ── Formulario de pago ── */}
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Selección de método */}
          <div>
            <p style={eyebrowStyle}>Método de pago</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); clearResult(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px',
                    background: method === m.id ? 'var(--bg-2)' : 'transparent',
                    border: `1px solid ${method === m.id ? 'var(--line-2)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: method === m.id ? 'var(--bg-3)' : 'var(--bg-2)',
                    color: 'var(--type-soft)',
                    transition: 'background 0.2s',
                  }}>
                    {m.icon}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 13, letterSpacing: '.04em', color: 'var(--type)', fontWeight: method === m.id ? 600 : 400 }}>
                      {m.label}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 2 }}>
                      {m.description}
                    </span>
                  </span>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${method === m.id ? 'var(--type)' : 'var(--line-2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.2s',
                  }}>
                    {method === m.id && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--type)' }} />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulario según método */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '28px 28px' }}>

            {/* ── TARJETA ── */}
            {method === 'card' && (
              <form onSubmit={handleCard} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Datos de la tarjeta</label>
                  <div
                    ref={cardMountRef}
                    style={{
                      padding: '13px 14px',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Meses sin intereses</label>
                  <select
                    value={installments}
                    onChange={e => setInstallments(Number(e.target.value))}
                    style={inputStyle}
                  >
                    {MSI_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p style={hintStyle}>Disponible en tarjetas de crédito mexicanas participantes.</p>
                </div>

                <SubmitBtn loading={loading} label="Pagar ahora" />
              </form>
            )}

            {/* ── OXXO ── */}
            {method === 'oxxo' && (
              <form onSubmit={handleOxxo} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
                  <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
                    Generamos un voucher con número de referencia. Paga en cualquier tienda OXXO. La confirmación llega en ~1 hora.
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Nombre completo</label>
                  <input name="oxxoName" type="text" placeholder="Juan Pérez García" style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input name="oxxoEmail" type="email" placeholder="juan@correo.com" style={inputStyle} required />
                  <p style={hintStyle}>Recibirás el voucher en este correo.</p>
                </div>
                <SubmitBtn loading={loading} label="Generar voucher OXXO" />
              </form>
            )}

            {/* ── SPEI ── */}
            {method === 'spei' && (
              <form onSubmit={handleSpei} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
                  <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
                    Generamos una CLABE interbancaria única para tu pago. Realiza la transferencia desde tu banca en línea o app.
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Nombre completo</label>
                  <input name="speiName" type="text" placeholder="Juan Pérez García" style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input name="speiEmail" type="email" placeholder="juan@correo.com" style={inputStyle} required />
                  <p style={hintStyle}>Recibirás los datos de transferencia en este correo.</p>
                </div>
                <SubmitBtn loading={loading} label="Obtener CLABE SPEI" />
              </form>
            )}

            {/* Resultado */}
            {result && <ResultBox result={result} />}
          </div>

          <p style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', textAlign: 'center' }}>
            Al continuar aceptas nuestros{' '}
            <a href="/terminos" style={{ color: 'var(--type-soft)', textDecoration: 'underline' }}>Términos y condiciones</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function SubmitBtn({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '13px 18px',
        background: 'var(--type)', color: 'var(--bg)',
        border: 0, borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.2s',
        marginTop: 4,
      }}
    >
      {loading && <Spinner />}
      {loading ? 'Procesando...' : label}
    </button>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: '50%',
      border: '2px solid rgba(0,0,0,.2)',
      borderTopColor: 'currentColor',
      display: 'inline-block',
      animation: 'spin .7s linear infinite',
    }} />
  );
}

function ResultBox({ result }) {
  const styles = {
    success: { bg: 'rgba(99,196,77,.08)',  border: 'rgba(99,196,77,.25)',  title: '#63C44D' },
    error:   { bg: 'rgba(224,80,80,.08)',  border: 'rgba(224,80,80,.3)',   title: '#e05050' },
    info:    { bg: 'rgba(81,112,255,.08)', border: 'rgba(81,112,255,.25)', title: 'var(--type-soft)' },
  };
  const c = styles[result.type];

  return (
    <div style={{
      marginTop: 20,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius)', padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: 'var(--body)', fontSize: 13, lineHeight: 1.6, color: 'var(--type-soft)',
    }}>
      {result.title && (
        <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.08em', fontWeight: 700, color: c.title, margin: 0 }}>
          {result.title}
        </p>
      )}
      {result.lines?.map((l, i) => <p key={i} style={{ margin: 0 }}>{l}</p>)}
      {result.clabe && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 6px' }}>
            CLABE interbancaria
          </p>
          <p style={{
            background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 8, fontFamily: 'monospace', fontSize: 15,
            letterSpacing: 2, padding: '10px 14px', margin: 0, color: 'var(--type)',
          }}>
            {result.clabe}
          </p>
        </div>
      )}
      {result.link && (
        <a
          href={result.link.href} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent-blue)', textDecoration: 'none', marginTop: 4, fontSize: 13 }}
        >
          {result.link.label}
        </a>
      )}
      {result.note && <p style={{ color: 'var(--type-muted)', fontSize: 12, margin: 0 }}>{result.note}</p>}
      {result.id   && <p style={{ color: 'var(--type-muted)', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>ID: {result.id}</p>}
    </div>
  );
}

// ── Estilos compartidos ────────────────────────────────────────────────────
const eyebrowStyle = {
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em',
  textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 14px',
};

const labelStyle = {
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em',
  textTransform: 'uppercase', color: 'var(--type-soft)',
  display: 'block', marginBottom: 8,
};

const inputStyle = {
  width: '100%', padding: '12px 14px',
  background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', fontFamily: 'var(--body)', fontSize: 14,
  color: 'var(--type)', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', appearance: 'none',
};

const hintStyle = {
  fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)',
  margin: '6px 0 0', lineHeight: 1.5,
};
