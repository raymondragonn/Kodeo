import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Nav from './Nav';
import { API_BASE_URL as API } from '../lib/api';

// Debe coincidir con MSI_SURCHARGE_RATES en backend/config.php (el servidor recalcula el total)
const MSI_SURCHARGE = { 3: 0.05, 6: 0.075, 9: 0.10, 12: 0.125, 18: 0.175, 24: 0.225 };

const MSI_OPTIONS = [
  { value: 0,  label: 'Pago de contado' },
  { value: 3,  label: '3 meses' },
  { value: 6,  label: '6 meses' },
  { value: 9,  label: '9 meses' },
  { value: 12, label: '12 meses' },
  { value: 18, label: '18 meses' },
  { value: 24, label: '24 meses' },
];

const money = (cents, currency = 'MXN') =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency });

export default function OrderPaymentPage({
  copy,
  theme = 'dark',
  user,
  onBack,
  onNavigate,
  onNavItemClick,
  onContact,
  onServiceClick,
  onAuthClick,
  onLogout,
  onThemeToggle,
}) {
  const { token: orderToken } = useParams();
  const authToken = localStorage.getItem('token');

  const [order, setOrder]     = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [installments, setInstallments] = useState(0);
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paid, setPaid]       = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [promoInput, setPromoInput]   = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError]   = useState(null);

  const stripeRef    = useRef(null);
  const cardRef      = useRef(null);
  const cardMountRef = useRef(null);

  // ── Sin sesión: guardamos la URL de la orden y mandamos a login; al entrar vuelve solo ──
  useEffect(() => {
    if (authToken) return;
    const target = `/pago/orden/${orderToken}`;
    localStorage.setItem('kodeo_redirect', target);
    onNavigate?.('/login', { state: { from: target } });
  }, [authToken, orderToken, onNavigate]);

  // ── Cargar la orden ──
  const loadOrder = useCallback(async () => {
    if (!authToken) return;
    try {
      const res  = await fetch(`${API}/payment-orders.php?token=${orderToken}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.error) { setFetchError(data.error); return; }
      setOrder(data.order);
      if (data.publishableKey && window.Stripe && !stripeRef.current) {
        stripeRef.current = window.Stripe(data.publishableKey);
        setStripeReady(true);
      }
    } catch {
      setFetchError('No se pudo conectar con el servidor.');
    }
  }, [authToken, orderToken]);

  useEffect(() => {
    const waitForStripe = () =>
      new Promise((resolve) => {
        if (window.Stripe) { resolve(); return; }
        const script = document.querySelector('script[src*="js.stripe.com"]');
        script ? script.addEventListener('load', resolve, { once: true }) : resolve();
      });
    waitForStripe().then(loadOrder);
  }, [loadOrder]);

  const pending = order?.status === 'pendiente' && !paid;

  // ── Montar card element ──
  useEffect(() => {
    if (!stripeReady || !pending || cardRef.current) return;

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
  }, [stripeReady, pending, theme]);

  // ── Totales (el servidor los recalcula: esto es solo el desglose visual) ──
  const baseCents   = order ? Math.round(Number(order.amount) * 100) : 0;
  const chargeCents = promoResult?.valid ? promoResult.final_cents : baseCents;
  const allowMsi    = Number(order?.permite_msi) === 1;
  const msiRate     = allowMsi && installments > 0 ? (MSI_SURCHARGE[installments] ?? 0) : 0;
  const surcharge   = Math.round(chargeCents * msiRate);
  const totalCents  = chargeCents + surcharge;
  const currency    = order?.currency || 'MXN';
  const isExtra     = Number(order?.es_cargo_extra) === 1;

  // ── Código de descuento ──
  const clearPromo = () => { setPromoResult(null); setPromoInput(''); setPromoError(null); };

  const applyPromo = async () => {
    const trimmed = promoInput.trim().toUpperCase();
    if (!trimmed) return;
    setPromoLoading(true); setPromoError(null);
    try {
      const res  = await fetch(`${API}/validate-promo.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ code: trimmed, amount: baseCents }),
      });
      const data = await res.json();
      if (data.error && !('valid' in data)) throw new Error(data.error);
      if (!data.valid) setPromoError(data.error || 'Código inválido o expirado');
      else             setPromoResult({ ...data, code: trimmed });
    } catch (err) {
      setPromoError(err.message);
    } finally { setPromoLoading(false); }
  };

  // ── Pagar ──
  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !cardRef.current) {
      setPayError('Stripe no está listo. Recarga la página.');
      return;
    }
    setLoading(true); setPayError(null);
    try {
      const res  = await fetch(`${API}/create-payment-intent.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          payment_order_token: orderToken,
          installments: allowMsi ? installments : 0,
          promo_code: promoResult?.valid ? promoResult.code : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { paymentIntent, error } = await stripeRef.current.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardRef.current },
      });
      if (error) throw new Error(error.message);

      if (paymentIntent.status === 'succeeded') {
        try {
          await fetch(`${API}/confirm-payment.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });
        } catch { /* el webhook lo respaldará si esto falla */ }
        setPaid(true);
      }
    } catch (err) {
      setPayError(err.message);
    } finally { setLoading(false); }
  };

  // ── Render ──
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

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 120px' }}>

        {!authToken && (
          <p style={mutedText}>Redirigiendo al inicio de sesión…</p>
        )}

        {authToken && fetchError && (
          <div style={{ border: '1px solid rgba(224,80,80,.3)', background: 'rgba(224,80,80,.08)', padding: '20px 24px' }}>
            <p style={{ ...eyebrowStyle, color: '#e05050' }}>Orden de pago</p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0 }}>{fetchError}</p>
          </div>
        )}

        {authToken && !fetchError && !order && (
          <p style={mutedText}>Cargando tu orden…</p>
        )}

        {order && (
          <>
            <div style={{ marginBottom: 40 }}>
              <p style={eyebrowStyle}>
                {isExtra ? 'Solicitud de cambio · Aprobación y pago' : 'Orden de pago · Pago seguro'}
              </p>
              <h1 style={{
                fontFamily: 'var(--display)', fontWeight: 400,
                fontSize: 'clamp(34px, 6vw, 56px)', lineHeight: 1,
                letterSpacing: '-0.03em', margin: 0, paddingBottom: '0.08em',
              }}>
                {order.project_name}
              </h1>
            </div>

            {/* ── Desglose ── */}
            <div style={{ border: '1px solid var(--line)', marginBottom: 28 }}>
              <div style={{ height: 3, background: isExtra ? 'var(--accent-yellow)' : 'var(--accent-blue)' }} />
              <Row label="Proyecto">{order.project_name}</Row>
              {order.descripcion && <Row label="Concepto">{order.descripcion}</Row>}
              {isExtra && (
                <Row label="Tipo">
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent-yellow)' }}>
                    Cargo extra por cambios
                  </span>
                </Row>
              )}
              <Row label="Moneda">{currency}</Row>
              {pending && promoResult?.valid && (
                <Row label="Descuento">
                  <span style={{ color: '#63C44D' }}>−{money(promoResult.discount_cents, currency)}</span>
                </Row>
              )}
              {pending && installments > 0 && (
                <Row label="Por mes">~{money(Math.round(totalCents / installments), currency)}</Row>
              )}
              {pending && surcharge > 0 && (
                <Row label={`Cargo por cuotas (${installments} meses)`}>
                  <span style={{ color: 'var(--type-muted)' }}>+{money(surcharge, currency)}</span>
                </Row>
              )}
              <Row label="Total">
                <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em' }}>
                  {money(pending ? totalCents : baseCents, currency)}
                </span>
              </Row>
            </div>

            {/* ── Estados finales ── */}
            {(order.status === 'pagado' || paid) && (
              <SuccessBox onNavigate={onNavigate} justPaid={paid} />
            )}

            {order.status === 'cancelado' && !paid && (
              <p style={{ ...mutedText, border: '1px solid var(--line)', padding: '18px 22px' }}>
                Esta orden fue cancelada. Si crees que es un error, contáctanos.
              </p>
            )}

            {/* ── Código de descuento ── */}
            {pending && (
              <div style={{ marginBottom: 28 }}>
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
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
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
            )}

            {/* ── Formulario de pago ── */}
            {pending && (
              <form onSubmit={handlePay} style={{ border: '1px solid var(--line)', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Datos de la tarjeta</label>
                  <div ref={cardMountRef} style={{ padding: '13px 14px', background: 'var(--bg)', border: '1px solid var(--line)' }} />
                  {!stripeReady && <p style={hintStyle}>Cargando pasarela segura…</p>}
                </div>

                {allowMsi && (
                  <div>
                    <label style={labelStyle}>Meses sin intereses</label>
                    <select value={installments} onChange={e => setInstallments(Number(e.target.value))} style={inputStyle}>
                      {MSI_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <p style={hintStyle}>El cargo por cuotas se suma al total. Disponible en tarjetas de crédito mexicanas participantes.</p>
                  </div>
                )}

                {payError && (
                  <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: '#e05050', margin: 0 }}>{payError}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !stripeReady}
                  style={{
                    width: '100%', padding: '13px 18px',
                    background: 'var(--type)', color: 'var(--bg)',
                    border: 0, borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                    cursor: loading || !stripeReady ? 'not-allowed' : 'pointer',
                    opacity: loading || !stripeReady ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? 'Procesando…' : isExtra ? 'Aprobar y pagar' : 'Pagar ahora'}
                </button>

                <p style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)', textAlign: 'center', margin: 0 }}>
                  Pagos procesados de forma segura por <strong style={{ color: 'var(--type-soft)' }}>Stripe</strong>.
                  Al continuar aceptas nuestros <a href="/terminos" style={{ color: 'var(--type-soft)' }}>Términos y condiciones</a>.
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SuccessBox({ onNavigate, justPaid }) {
  return (
    <div style={{ border: '1px solid rgba(99,196,77,.3)', background: 'rgba(99,196,77,.06)', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', color: '#63C44D', margin: 0 }}>
        {justPaid ? '¡Pago recibido!' : 'Esta orden ya fue pagada'}
      </p>
      <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0, lineHeight: 1.6 }}>
        Tu proyecto ya está activo en tu panel. Ahí podrás seguir el avance y cualquier ajuste pendiente.
      </p>
      <button
        onClick={() => onNavigate?.('/proyectos')}
        style={{
          alignSelf: 'flex-start', padding: '11px 22px',
          background: 'var(--type)', color: 'var(--bg)',
          border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
        }}
      >
        Ir a mi panel →
      </button>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      padding: '18px 22px', borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
    }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

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
  color: 'var(--type)', outline: 'none', boxSizing: 'border-box', appearance: 'none',
};

const hintStyle = {
  fontFamily: 'var(--body)', fontSize: 11, color: 'var(--type-muted)',
  margin: '6px 0 0', lineHeight: 1.5,
};

const mutedText = {
  fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-muted)', margin: 0,
};
