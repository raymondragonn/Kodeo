import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { estimatedDeliveryDate, formatDateEs } from '../utils/deliveryDate';
import { API_BASE_URL as API } from '../lib/api';
import { trackFormStart, trackFormSubmit } from '../lib/analytics';

const ACCENT = {
  '01': 'var(--accent-green)',
  '02': 'var(--accent-blue)',
  '03': 'var(--accent-yellow)',
  '04': 'var(--accent-orange)',
};


const MSI_SURCHARGE = {
  3:  0.05,
  6:  0.075,
  9:  0.10,
  12: 0.125,
  18: 0.175,
  24: 0.225,
};

const MSI_OPTIONS = [
  { value: 0,  label: 'Pago de contado' },
  { value: 3,  label: '3 meses  (+5%)' },
  { value: 6,  label: '6 meses  (+7.5%)' },
  { value: 9,  label: '9 meses  (+10%)' },
  { value: 12, label: '12 meses (+12.5%)' },
  { value: 18, label: '18 meses (+17.5%)' },
  { value: 24, label: '24 meses (+22.5%)' },
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
  code      = '01',
  copy,
  motionSpeed = 1,
  theme     = 'dark',
  onBack,
  onNavigate,
  onNavItemClick,
  onContact,
  onServiceClick,
  onAuthClick,
  onLogout,
  user,
  onThemeToggle,
}) {
  const location     = useLocation();
  const appointmentId = location.state?.appointmentId ?? null;
  const [method, setMethod]         = useState('card');
  const [methodChosen, setMethodChosen] = useState(false);
  const [installments, setInstallments] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [promoInput, setPromoInput]   = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError]   = useState(null);

  const stripeRef    = useRef(null);
  const cardRef      = useRef(null);
  const cardMountRef = useRef(null);
  const formsStarted = useRef(new Set());

  const handleFormFocus = (formId) => {
    if (formsStarted.current.has(formId)) return;
    formsStarted.current.add(formId);
    trackFormStart({ form_id: `checkout_${formId}`, form_location: 'checkout' });
  };
  const token        = localStorage.getItem('token');
  const { isMobile } = useBreakpoint();
  const accent        = ACCENT[code] || ACCENT['01'];
  const serviceInfo   = copy.services.list.find(s => s.code === code);
  const deliveryDate  = formatDateEs(estimatedDeliveryDate(serviceInfo?.time ?? '8 días hábiles'));

  // ── Requiere sesión: una compra debe quedar asociada a un usuario ──────────
  useEffect(() => {
    if (!token) onNavigate?.('/login');
  }, [token, onNavigate]);

  const chargeAmount  = promoResult?.valid ? promoResult.final_cents : amount;

  const msiRate      = (method === 'card' && installments > 0) ? (MSI_SURCHARGE[installments] ?? 0) : 0;
  const msiSurcharge = Math.round(chargeAmount * msiRate);
  const totalAmount  = chargeAmount + msiSurcharge;

  const displayAmount = (totalAmount / 100).toLocaleString('es-MX', {
    style: 'currency', currency,
  });

  const monthlyAmount = (plan) =>
    plan > 0
      ? (totalAmount / 100 / plan).toLocaleString('es-MX', { style: 'currency', currency })
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

      if (!token) return;

      try {
        const res  = await fetch(`${API}/create-payment-intent.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount, installments: 0, service }),
        });
        const data = await res.json();
        if (data.error || !data.publishableKey) return;
        stripeRef.current = window.Stripe(data.publishableKey);
        setStripeReady(true);
      } catch { /* Stripe no disponible */ }
    };
    init();
  }, [amount, service, token]);

  // ── Montar card element ───────────────────────────────────────────────────
  useEffect(() => {
    if (!stripeReady || method !== 'card' || !methodChosen) return;
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
  }, [stripeReady, method, methodChosen, theme]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearResult = () => setResult(null);
  const clearPromo  = () => { setPromoResult(null); setPromoInput(''); setPromoError(null); };

  const applyPromo = async () => {
    const trimmed = promoInput.trim().toUpperCase();
    if (!trimmed) return;
    setPromoLoading(true); setPromoError(null);
    try {
      const res  = await fetch(`${API}/validate-promo.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: trimmed, amount }),
      });
      const data = await res.json();
      if (data.error && !('valid' in data)) throw new Error(data.error);
      if (!data.valid) setPromoError(data.error || 'Código inválido o expirado');
      else             setPromoResult({ ...data, code: trimmed });
    } catch (err) {
      setPromoError(err.message);
    } finally { setPromoLoading(false); }
  };

  const postAPI = async (endpoint, body) => {
    const payload = { ...body, service, code };
    if (appointmentId) payload.appointment_id = appointmentId;
    if (promoResult?.valid) payload.promo_code = promoResult.code;
    const res  = await fetch(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
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
      const { clientSecret } = await postAPI('create-payment-intent.php', { amount: totalAmount, installments });
      const { paymentIntent, error } = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: { card: cardRef.current },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent.status === 'succeeded') {
        try {
          await postAPI('confirm-payment.php', { paymentIntentId: paymentIntent.id });
        } catch { /* el webhook lo respaldará si esto falla */ }
        trackFormSubmit({ form_id: 'checkout_card', form_location: 'checkout' });
        onNavigate?.(`/pago-confirmado?payment_intent=${paymentIntent.id}&redirect_status=succeeded`);
        return;
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
      const data = await postAPI('create-oxxo.php', { amount: chargeAmount, name, email });
      setResult({
        type: 'info',
        title: 'Voucher OXXO generado',
        lines: [`Monto a pagar: ${displayAmount}`, 'Vigencia: 3 días'],
        link: data.voucherUrl ? { href: data.voucherUrl, label: 'Ver e imprimir voucher' } : null,
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
      const data = await postAPI('create-spei.php', { amount: chargeAmount, name, email });
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onAuthClick={onAuthClick}
        onLogout={onLogout}
        user={user}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />

      <main style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: isMobile ? '48px 20px 80px' : '80px 36px 120px',
      }}>
        <div style={{ marginBottom: isMobile ? 36 : 56 }}>
          <p style={eyebrowStyle}>Checkout · Pago seguro</p>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: isMobile ? 'clamp(34px, 9vw, 52px)' : 'clamp(40px, 5vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            margin: 0,
            paddingBottom: '0.08em',
          }}>
            {service}
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Resumen del pedido ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ border: '1px solid var(--line)' }}>
              <div style={{ height: 3, background: accent }} />
              <Row label="Servicio">{service}</Row>
              <Row label="Moneda">{currency}</Row>
              <Row label="Entrega estimada">{deliveryDate}</Row>
              {installments > 0 && method === 'card' && (
                <Row label="Por mes">~{monthlyAmount(installments)}</Row>
              )}
              {promoResult?.valid && (
                <Row label="Descuento">
                  <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '-0.01em', color: '#63C44D' }}>
                    -{(promoResult.discount_cents / 100).toLocaleString('es-MX', { style: 'currency', currency })}
                  </span>
                </Row>
              )}
              {method === 'card' && installments > 0 && msiSurcharge > 0 && (
                <Row label={`Cargo por cuotas (${installments} meses)`}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '-0.01em', color: 'var(--type-muted)' }}>
                    +{(msiSurcharge / 100).toLocaleString('es-MX', { style: 'currency', currency })}
                  </span>
                </Row>
              )}
              <Row label="Total">
                <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)' }}>
                  {displayAmount}
                </span>
              </Row>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px', border: '1px solid var(--line)' }}>
              <svg width="16" height="16" style={{ color: 'var(--type-muted)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', margin: 0, lineHeight: 1.6 }}>
                Pagos procesados de forma segura por <strong style={{ color: 'var(--type-soft)' }}>Stripe</strong>. Tus datos están encriptados.
              </p>
            </div>
          </div>

          {/* ── Código de descuento ── */}
          <div>
            <p style={eyebrowStyle}>¿Tienes un código de descuento?</p>
            {promoResult?.valid ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', border: '1px solid rgba(99,196,77,.4)', background: 'rgba(99,196,77,.06)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#63C44D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ flex: 1, fontFamily: 'var(--body)', fontSize: 13, color: '#63C44D' }}>
                  <strong>{promoResult.code}</strong> — {promoResult.description}
                </span>
                <button
                  type="button"
                  onClick={clearPromo}
                  style={{ background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--type-muted)', padding: 0 }}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
                  <input
                    value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    placeholder="KODEO20"
                    style={{ ...inputStyle, flex: 1, border: 0, borderRight: '1px solid var(--line)' }}
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    style={{ padding: '12px 20px', background: 'none', border: 0, cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--type-soft)', opacity: promoLoading || !promoInput.trim() ? 0.45 : 1, whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}
                  >
                    {promoLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {promoError && <p style={{ ...hintStyle, color: '#e05050', marginTop: 8 }}>{promoError}</p>}
              </>
            )}
          </div>

          {/* ── Formulario de pago ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Selección de método */}
            <div>
              <p style={eyebrowStyle}>Método de pago</p>

              {methodChosen ? (
                (() => {
                  const selected = METHODS.find(m => m.id === method);
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 20px',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--line)',
                    }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, flexShrink: 0,
                        background: 'var(--bg-3)', color: accent,
                      }}>
                        {selected.icon}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 13, letterSpacing: '.04em', color: 'var(--type)', fontWeight: 600 }}>
                          {selected.label}
                        </span>
                        <span style={{ display: 'block', fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 2 }}>
                          {selected.description}
                        </span>
                      </span>
                      <button
                        onClick={() => setMethodChosen(false)}
                        style={{
                          background: 'none', border: 0, cursor: 'pointer',
                          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.08em',
                          textTransform: 'uppercase', color: accent, padding: 0,
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div style={{ border: '1px solid var(--line)' }}>
                  {METHODS.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => { setMethod(m.id); setMethodChosen(true); clearResult(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '16px 20px',
                        background: method === m.id ? 'var(--bg-2)' : 'transparent',
                        border: 0,
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, flexShrink: 0,
                        background: method === m.id ? 'var(--bg-3)' : 'var(--bg-2)',
                        color: method === m.id ? accent : 'var(--type-soft)',
                        transition: 'background 0.2s, color 0.2s',
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
                        border: `2px solid ${method === m.id ? accent : 'var(--line-2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'border-color 0.2s',
                      }}>
                        {method === m.id && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario según método */}
            {methodChosen && (
            <div style={{ border: '1px solid var(--line)', padding: 28 }}>

              {/* ── TARJETA ── */}
              {method === 'card' && (
                <form onSubmit={handleCard} onFocusCapture={() => handleFormFocus('card')} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Datos de la tarjeta</label>
                    <div
                      ref={cardMountRef}
                      style={{
                        padding: '13px 14px',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
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
                    <p style={hintStyle}>El cargo por cuotas se suma al total. Disponible en tarjetas de crédito mexicanas participantes.</p>
                  </div>

                  <SubmitBtn loading={loading} label="Pagar ahora" />
                </form>
              )}

              {/* ── OXXO ── */}
              {method === 'oxxo' && (
                <form onSubmit={handleOxxo} onFocusCapture={() => handleFormFocus('oxxo')} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
                <form onSubmit={handleSpei} onFocusCapture={() => handleFormFocus('spei')} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
            )}

            <p style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', textAlign: 'center' }}>
              Al continuar aceptas nuestros{' '}
              <a href="/terminos" style={{ color: 'var(--type-soft)', textDecoration: 'underline' }}>Términos y condiciones</a>.
            </p>
          </div>
        </div>
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{
      padding: '20px 22px',
      borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)' }}>{children}</span>
    </div>
  );
}

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

function ClabeCopy({ clabe }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clabe);
    } catch {
      /* clipboard no disponible */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 6px' }}>
        CLABE interbancaria
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg)', border: '1px solid var(--line)',
        padding: '10px 14px',
      }}>
        <p style={{
          fontFamily: 'monospace', fontSize: 15,
          letterSpacing: 2, margin: 0, color: 'var(--type)', flex: 1,
        }}>
          {clabe}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'none', border: 0, cursor: 'pointer', padding: '4px 6px',
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.06em',
            color: copied ? '#63C44D' : 'var(--type-soft)',
          }}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
    </div>
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
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: 'var(--body)', fontSize: 13, lineHeight: 1.6, color: 'var(--type-soft)',
    }}>
      {result.title && (
        <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.08em', fontWeight: 700, color: c.title, margin: 0 }}>
          {result.title}
        </p>
      )}
      {result.lines?.map((l, i) => <p key={i} style={{ margin: 0 }}>{l}</p>)}
      {result.clabe && <ClabeCopy clabe={result.clabe} />}
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
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.22em',
  textTransform: 'uppercase', color: 'var(--type-soft)', margin: '0 0 14px',
};

const labelStyle = {
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em',
  textTransform: 'uppercase', color: 'var(--type-soft)',
  display: 'block', marginBottom: 8,
};

const inputStyle = {
  width: '100%', padding: '12px 14px',
  background: 'var(--bg)', border: '1px solid var(--line)',
  fontFamily: 'var(--body)', fontSize: 14,
  color: 'var(--type)', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', appearance: 'none',
};

const hintStyle = {
  fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)',
  margin: '6px 0 0', lineHeight: 1.5,
};
